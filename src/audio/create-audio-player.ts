import {
  createEffect,
  useContext,
  createResource,
  untrack,
  onCleanup,
  createComputed,
  batch,
} from 'solid-js'
import { usePlayerStore } from '../stores/stores'
import { RepeatState } from '../stores/player/create-player-store'
import { isEventMeantForTextInput } from '../utils'
import { KeyboardCode } from '../utils/key-codes'
import { MusicImagesContext } from '../components/music-image/data-context'
import { toast } from '~/components/toast/toast'
import { getCachedAudio } from './audio-cache'

const toastPlayerError = () => {
  toast({
    message: "Something went wrong. Player wasn't able to play selected track.",
    duration: false,
  })
}

export const useAudioPlayer = (): void => {
  const audio = new Audio()

  const [playerState, playerActions] = usePlayerStore()

  const activeTrack = () => playerState.activeTrack

  const [
    trackAudioFile,
    { refetch: refetchTrackAudioFile, mutate: mutateTrackAudioFile },
  ] = createResource(activeTrack, async (track) => {
    console.log(`[AudioPlayer] Processing track:`, track?.name || 'unknown')
    const fileWrapper = track?.fileWrapper

    if (!fileWrapper) {
      console.log(`[AudioPlayer] No fileWrapper found`)
      return undefined
    }

    console.log(`[AudioPlayer] FileWrapper type: ${fileWrapper.type}`)

    if (fileWrapper.type === 'file') {
      console.log(`[AudioPlayer] Using direct file`)
      return fileWrapper.file
    }

    if (fileWrapper.type === 'url') {
      console.log(`[AudioPlayer] Using URL with caching: ${fileWrapper.url}`)
      // For URL-based audio files, use caching
      const cachedUrl = await getCachedAudio(fileWrapper.url)
      console.log(`[AudioPlayer] Got cached URL: ${cachedUrl}`)
      return cachedUrl
    }

    console.log(`[AudioPlayer] Using file system access API`)
    // Handle file system access API (existing logic)
    const fileRef = fileWrapper.file

    let mode = await fileRef.queryPermission({ mode: 'read' })
    if (mode !== 'granted') {
      try {
        // Try to request permission if it's not denied.
        if (mode === 'prompt') {
          mode = await fileRef.requestPermission({ mode: 'read' })
        }
      } catch {
        // User activation is required to request permission. Catch the error.
      }

      if (mode !== 'granted') {
        return null
      }
    }

    return fileRef.getFile()
  })

  // createResource doesn't fetch when fetcher retuns undefined or null
  // so if active track doesn't exist anymore force stop the player.
  createComputed(() => {
    if (activeTrack() === undefined) {
      mutateTrackAudioFile(undefined)
      playerActions.pause()
    }
  })

  createEffect(() => {
    const { isPlaying } = playerState
    const audioFile = trackAudioFile()

    console.log(`[AudioPlayer] Effect triggered - isPlaying: ${isPlaying}, loading: ${trackAudioFile.loading}`)

    if (trackAudioFile.loading) {
      console.log(`[AudioPlayer] Audio file loading, cleaning up previous src`)
      const previousAudioSrc = audio.src
      if (previousAudioSrc) {
        console.log(`[AudioPlayer] Previous src: ${previousAudioSrc}`)
        audio.src = ''
        // Setting src = '', changes src to site href address,
        // fully reset src by removing attribute itself.
        audio.removeAttribute('src')
        // Only revoke object URLs (blob URLs), not direct URLs
        if (previousAudioSrc.startsWith('blob:')) {
          console.log(`[AudioPlayer] Revoking blob URL: ${previousAudioSrc}`)
          URL.revokeObjectURL(previousAudioSrc)
        }
      }

      return
    }

    if (!isPlaying) {
      console.log(`[AudioPlayer] Not playing, pausing audio`)
      audio.pause()
      // Destroy active minute when paused
      if (activeTrack()) {
        playerActions.destroyCurrentActiveMinute()
      }
      return
    }

    // File permission was denied.
    if (audioFile === null) {
      // Set undefined so we can request file again later.
      mutateTrackAudioFile(undefined)
      playerActions.pause()

      toast({
        message: 'To play selected track please grant requested permission first.',
        duration: false,
      })
    
      return
    }

    if (audioFile === undefined) {
      refetchTrackAudioFile()
      return
    }

    try {
      if (!audio.src) {
        console.log(`[AudioPlayer] Setting audio source, audioFile type: ${typeof audioFile}`)
        // Handle URL-based audio files vs File objects
        if (typeof audioFile === 'string') {
          console.log(`[AudioPlayer] Setting string URL: ${audioFile}`)
          console.log(`[AudioPlayer] Is cached blob URL: ${audioFile.startsWith('blob:')}`)
          audio.src = audioFile
        } else {
          console.log(`[AudioPlayer] Creating object URL for File object`)
          audio.src = URL.createObjectURL(audioFile)
        }
        console.log(`[AudioPlayer] Audio src set to: ${audio.src}`)
        
        // Set the saved currentTime after audio source is set
        if (playerState.currentTimeChanged) {
          const targetTime = playerState.currentTime
          console.log(`[AudioPlayer] Restoring currentTime to: ${targetTime}`)
          
          if (audio.readyState >= 1) {
            audio.currentTime = targetTime
          } else {
            const setTimeOnLoad = () => {
              audio.currentTime = targetTime
              audio.removeEventListener('loadedmetadata', setTimeOnLoad)
            }
            audio.addEventListener('loadedmetadata', setTimeOnLoad)
          }
        }
      }
      // TODO: When active track is changed very rapidly this error occurs:
      // 'The play() request was interrupted by a new load request.'
      console.log(`[AudioPlayer] Starting playback`)
      audio.play().then(() => {
        // Ensure active minute when playback starts successfully
        if (activeTrack()) {
          playerActions.ensureActiveMinuteForCurrentTime(activeTrack()!.id, playerState.currentTime)
        }
      }).catch(err => {
        console.error(`[AudioPlayer] Error during playback:`, err)
        playerActions.pause()
        toastPlayerError()
      })
    } catch (err) {
      console.error(`[AudioPlayer] Error during playback:`, err)

      playerActions.pause()
      toastPlayerError()
    }
  })

  audio.onerror = (err) => {
    console.error(`[AudioPlayer] Audio error:`, err)
    console.log(`[AudioPlayer] Audio src when error occurred: ${audio.src}`)
    batch(() => {
      playerActions.pause()
      toastPlayerError()
    })
  }

  createEffect(() => {
    if (playerState.currentTimeChanged) {
      const targetTime = untrack(() => playerState.currentTime)
      const currentTrack = untrack(() => playerState.activeTrack)
      
              // Only set currentTime if we have a source and we're not changing tracks
        // (track changes are handled in the main audio effect)
        if (audio.src && currentTrack) {
          // If audio is ready, set currentTime immediately
          if (audio.readyState >= 1) { // HAVE_METADATA
            audio.currentTime = targetTime
          } else {
            // Otherwise, wait for loadedmetadata event
            const setTimeOnLoad = () => {
              audio.currentTime = targetTime
              audio.removeEventListener('loadedmetadata', setTimeOnLoad)
            }
            audio.addEventListener('loadedmetadata', setTimeOnLoad)
          }
        }
    }
  })

  audio.ondurationchange = () => {
    console.log(`[AudioPlayer] Duration changed: ${audio.duration}s`)
    playerActions.setDuration(audio.duration)
  }
  
  audio.ontimeupdate = () => {
    const currentTime = audio.currentTime
    const activeTrack = playerState.activeTrack
    
    // Only update time if we have an active track and it matches the current audio source
    // This prevents race conditions when switching tracks
    if (activeTrack && audio.src) {
      playerActions.setCurrentTime(currentTime)
      
      // Save timestamp periodically during playback
      if (currentTime > 0) {
        playerActions.saveTrackTimestamp(activeTrack.id, currentTime)
      }
    }
  }

  audio.onended = () => {
    const { repeat, activeTrack } = playerState
    
    console.log(`[AudioPlayer] Track ended: ${activeTrack?.name || 'unknown'}`)
    console.log(`[AudioPlayer] Repeat state: ${repeat}`)
    
    // Destroy active minute when track ends
    if (activeTrack) {
      playerActions.destroyCurrentActiveMinute()
      playerActions.clearTrackTimestamp(activeTrack.id)
    }
    
    if (repeat !== RepeatState.ONCE) {
      playerActions.playNextTrack(repeat === RepeatState.OFF)
    }
  }

  createEffect(() => {
    const k = 0.5 //value for adjusting the curve
    audio.volume = Math.pow(playerState.volume / 100, k)
    audio.muted = playerState.isMuted
    audio.loop = playerState.repeat === RepeatState.ONCE
  })

  document.addEventListener('keydown', (e) => {
    if (isEventMeantForTextInput(e)) {
      return
    }

    switch (e.code) {
      case KeyboardCode.SPACE:
        playerActions.playPause()
        break
      case KeyboardCode.M:
        playerActions.toggleMute()
        break
      default:
        return
    }

    e.preventDefault()
  })

  const ms = window.navigator.mediaSession
  if (ms) {
    const musicImages = useContext(MusicImagesContext)
    const imageKey = Symbol('key')

    createEffect(() => {
      const track = activeTrack()
      if (!track) {
        ms.metadata = null
        return
      }

      const { image } = track
      
      // Handle different image types
      let newImageSrc = ''
      if (typeof image === 'string') {
        // Direct URL string
        newImageSrc = image
      } else if (image && musicImages) {
        // Blob - use context to get object URL
        newImageSrc = musicImages.get(image, imageKey) || ''
      }

      ms.metadata = new MediaMetadata({
        title: track.name,
        artist: track.artists?.join(', '),
        album: track.album,
        artwork: [
          // TODO. This does not work with empty artwork, because it is svg in dom,
          // but maybe that's fine?
          { src: newImageSrc, sizes: '512x512', type: 'image/png' },
        ],
      })

      onCleanup(() => {
        if (image && typeof image !== 'string') {
          musicImages?.release(image, imageKey)
        }
      })
    })

    // Done for minification purposes.
    const setActionHandler = ms.setActionHandler.bind(ms)
    setActionHandler('play', playerActions.play)
    setActionHandler('pause', playerActions.pause)
    setActionHandler('previoustrack', playerActions.playPreveousTrack)
    setActionHandler('nexttrack', () => playerActions.playNextTrack())
    setActionHandler('seekbackward', () => {
      audio.currentTime = Math.max(audio.currentTime - 10, 0)
    })
    setActionHandler('seekforward', () => {
      audio.currentTime = Math.max(audio.currentTime - 10, 0)
    })
  }
}
