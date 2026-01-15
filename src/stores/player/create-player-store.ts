import { batch, createEffect, createMemo, untrack } from 'solid-js'
import { produce, createStore } from 'solid-js/store'
import { shuffleArray } from '../../utils/utils'
import { Track } from '../../types/types'
import { useEntitiesStore } from '../stores'
import { toast } from '~/components/toast/toast'

export const RepeatState = {
  OFF: 0,
  ALL: 1,
  ONCE: 2,
} as const
export type RepeatState = typeof RepeatState[keyof typeof RepeatState]

interface ActiveMinute {
  activeminute_timestamp_ms: number
  track_id: string
  track_timestamp_ms: number
}

interface State {
  isPlaying: boolean
  trackIds: readonly string[]
  // Used to store tracks in original order
  // when shuffle is on.
  originalTrackIds: readonly string[]
  // Currently playing audio track.
  activeTrackIndex: number
  repeat: RepeatState
  shuffle: boolean
  currentTime: number
  currentTimeChanged: boolean
  duration: number
  isMuted: boolean
  volume: number
  // ActiveMinute system - stores persisted active listening minutes
  activeMinutes: ActiveMinute[]
  // Current ActiveMinute in memory (not persisted until minute completes)
  currentActiveMinute: ActiveMinute | null
  // Flag to prevent time updates during track switching
  isSwitchingTracks: boolean
  readonly activeTrackId: string
  readonly activeTrack?: Track
}

type TrackIds = readonly string[]

export const createPlayerStore = () => {
  const [entities] = useEntitiesStore()

  const [state, setState] = createStore<State>({
    isPlaying: false,
    trackIds: [],
    originalTrackIds: [],
    activeTrackIndex: -1,
    repeat: RepeatState.OFF,
    shuffle: false,
    currentTime: 0,
    currentTimeChanged: false,
    duration: 0,
    isMuted: false,
    volume: 100,
    activeMinutes: [],
    currentActiveMinute: null,
    isSwitchingTracks: false,
    get activeTrackId(): string {
      // eslint-disable-next-line no-use-before-define
      return activeTrackIdMemo()
    },
    get activeTrack(): Track | undefined {
      // eslint-disable-next-line no-use-before-define
      return activeTrackMemo()
    },
  })

  // If state is modified inside batch memo won't run until batch is exited,
  // so offer these selectors directly for functions that need it.
  const activeTrackIdSelector = () => state.trackIds[state.activeTrackIndex]
  const activeTrackSelector = () =>
    entities.tracks[activeTrackIdSelector()] as Track | undefined

  const activeTrackIdMemo = createMemo(activeTrackIdSelector)
  const activeTrackMemo = createMemo(activeTrackSelector)

  const doesActiveTrackExist = () => !!state.activeTrack

  const play = () => {
    setState({
      isPlaying: doesActiveTrackExist(),
    })
  }

  const pause = () => {
    setState({ isPlaying: false })
  }

  const playPause = () => {
    setState({
      // Player can only be playing if active track exists.
      isPlaying: !state.isPlaying && doesActiveTrackExist(),
    })
  }

  const setShuffleEnabledTracksState = (index: number, tracks: TrackIds) => {
    setState({
      // Save original tracks order, so we can restore them
      // if shuffle is turned off.
      originalTrackIds: tracks,
      // Shuffle track ids and make active track first element.
      trackIds: shuffleArray(tracks, index),
      // Selected track in shuffled array is first.
      activeTrackIndex: 0,
    })
  }

  const playTrack = (index: number, tracks?: TrackIds) => {
    // Get track ID BEFORE any state changes (including shuffle)
    let trackId: string
    if (tracks) {
      trackId = tracks[index]
    } else {
      trackId = state.trackIds[index]
    }
    
    // Get saved timestamp for this track
    const savedTimestamp = getSavedTrackTimestamp(trackId)
    console.log(`[Player] Playing track ${trackId}, saved timestamp: ${savedTimestamp}s`)

    batch(() => {
      // Set switching flag to prevent time updates from interfering
      console.log(`[Player] Setting isSwitchingTracks flag for track ${trackId}`)
      setState({
        isSwitchingTracks: true,
      })
      
      if (tracks) {
        setState({
          trackIds: [...tracks],
        })

        if (state.shuffle) {
          setShuffleEnabledTracksState(index, tracks)
        } else {
          setState({
            activeTrackIndex: index,
          })
        }
      } else {
        setState({
          activeTrackIndex: index,
        })
      }
      
      setState({
        currentTime: savedTimestamp,
        currentTimeChanged: true,
      })
    })

    // Set isPlaying to true if track exists.
    setState('isPlaying', !!state.activeTrack)
    
    // Reset switching flag after a short delay to allow track switch to complete
    setTimeout(() => {
      console.log(`[Player] Clearing isSwitchingTracks flag for track ${trackId}`)
      setState({ isSwitchingTracks: false })
    }, 100)
  }

  const playNextTrack = (playUnlessLastTrack = false) => {
    const { trackIds, activeTrackIndex } = state
    const len = trackIds.length

    if (!len) {
      return
    }

    // If the queue has tracks but not an activeTrack
    // play the first track instead.
    if (activeTrackIndex === -1) {
      playTrack(0)
      return
    }

    const isTheLastTrack = len === activeTrackIndex + 1
    // If queue has reached the end and can't start from the beginning.
    if (isTheLastTrack && playUnlessLastTrack) {
      setState({ isPlaying: false })
      return
    }

    // Play next track or start from the beginning.
    const newIndex = isTheLastTrack ? 0 : activeTrackIndex + 1
    playTrack(newIndex)
  }

  const playPreveousTrack = () => {
    const { trackIds, activeTrackIndex } = state
    const len = trackIds.length

    if (!len) {
      return
    }

    let { currentTime } = state

    // If the queue has tracks but not an activeTrack
    // play the first track instead.
    let newIndex = activeTrackIndex
    if (newIndex === -1) {
      newIndex = 0

      // Play the same track from the beginning if more than
      // 4 secconds had passed.
    } else if (currentTime < 4) {
      newIndex = activeTrackIndex === 0 ? len - 1 : activeTrackIndex - 1
      currentTime = 0
    }

    playTrack(newIndex)
  }

  const addTracksToQueue = (trackIds: TrackIds) => {
    // Merge old queue items with new ones.
    setState(
      produce((s) => {
        let newTrackIds = trackIds

        if (s.shuffle) {
          newTrackIds = shuffleArray(trackIds)
          s.originalTrackIds = s.originalTrackIds.concat(trackIds)
        }

        s.trackIds = s.trackIds.concat(newTrackIds)
      }),
    )
  }

  const removeFromQueue = (trackIdsToBeRemoved: TrackIds) => {
    let { trackIds, originalTrackIds, activeTrackIndex: activeIndex } = state

    trackIds = trackIds.filter((id) => !trackIdsToBeRemoved.includes(id))
    if (state.shuffle) {
      // If shuffle is on tracks also need to be removed from cached tracks.
      originalTrackIds = originalTrackIds.filter(
        (id) => !trackIdsToBeRemoved.includes(id),
      )
    }

    // After removing tracks from the queue activeTrack index might have shifted.
    activeIndex = originalTrackIds.indexOf(state.activeTrackId)

    let stateIfTrackGotRemoved = {}
    // Track got removed.
    if (activeIndex === -1) {
      stateIfTrackGotRemoved = {
        isPlaying: false,
        currentTime: 0,
        duration: NaN,
      }
    }

    setState({
      ...stateIfTrackGotRemoved,
      trackIds,
      originalTrackIds,
      activeTrackIndex: activeIndex,
    })
  }

  const clearQueue = () => {
    setState({
      trackIds: [],
      originalTrackIds: [],
      isPlaying: false,
      currentTime: 0,
      duration: NaN,
    })
  }

  const toggleShuffle = () => {
    let { shuffle } = state

    // Toggle between states.
    shuffle = !shuffle

    batch(() => {
      if (shuffle) {
        setShuffleEnabledTracksState(state.activeTrackIndex, state.trackIds)
      } else {
        const { originalTrackIds } = state

        setState({
          // Track itself didn't change just its position after shuffle
          // inside queue so find new index of it.
          activeTrackIndex: originalTrackIds.indexOf(state.activeTrackId),
          // Restore original positions.
          trackIds: originalTrackIds,
          // Remove original tracks because they are only
          // stored when shuffling is enabled.
          originalTrackIds: [],
        })
      }
      setState('shuffle', shuffle)
    })
  }

  const toggleRepeat = () => {
    // Cycle between states 0, 1, 2, 0, 1...
    const repeatMap = {
      [RepeatState.OFF]: RepeatState.ALL,
      [RepeatState.ALL]: RepeatState.ONCE,
      [RepeatState.ONCE]: RepeatState.OFF,
    }

    setState({ repeat: repeatMap[state.repeat] })
  }

  const setCurrentTime = (payload: number) => {
    const shouldPreserveTimeChanged = state.isSwitchingTracks && state.currentTimeChanged
    if (shouldPreserveTimeChanged) {
      console.log(`[Player] Preserving currentTimeChanged during track switch, time: ${payload}`)
    }
    
    setState({
      // Don't reset currentTimeChanged during track switching to preserve saved timestamp restoration
      currentTimeChanged: state.isSwitchingTracks ? state.currentTimeChanged : false,
      currentTime: payload,
    })
  }

  const changeCurrentTime = (payload: number) => {
    setState({
      currentTime: payload,
      currentTimeChanged: true,
    })
  }

  const setDuration = (duration: number) => {
    setState({ duration })
  }

  const setVolume = (volume: number) => {
    setState({
      volume,
      isMuted: false,
    })
  }

  const toggleMute = () => {
    let { volume, isMuted } = state
    isMuted = !isMuted

    if (!isMuted && volume < 10) {
      volume = 10
    }
    setState({ volume, isMuted })
  }

  const addToQueue = (trackIds: TrackIds) => {
    addTracksToQueue(trackIds)
    toast({
      message: 'Selected tracks added to the queue',
      duration: 4000,
    })
  }

  // ActiveMinute utility functions
  const getActiveMinuteTimestamp = (timestamp: number): number => {
    // Floor to nearest minute (timestamp is already in milliseconds)
    return Math.floor(timestamp / 60000) * 60000 // 60000 = 60 * 1000 (milliseconds per minute)
  }

  const ensureActiveMinuteForCurrentTime = (trackId: string, trackTimestamp: number) => {
    const currentMinuteTimestamp = getActiveMinuteTimestamp(Date.now())
    
    // Check if we're transitioning to a new minute
    const isNewMinute = !state.currentActiveMinute || 
                       state.currentActiveMinute.activeminute_timestamp_ms !== currentMinuteTimestamp
    
    if (isNewMinute && state.currentActiveMinute) {
      // Persist the previous complete minute before creating new one
      setState('activeMinutes', (prev) => [...prev, state.currentActiveMinute!])
      console.log(`[ActiveMinute] Persisted completed minute ${state.currentActiveMinute.activeminute_timestamp_ms}`)
    }
    
    if (isNewMinute) {
      // Create new ActiveMinute in memory for this minute
      const activeMinute: ActiveMinute = {
        activeminute_timestamp_ms: currentMinuteTimestamp,
        track_id: trackId,
        track_timestamp_ms: trackTimestamp * 1000,
      }
      
      setState({ currentActiveMinute: activeMinute })
      console.log(`[ActiveMinute] Created in-memory minute ${currentMinuteTimestamp} for track ${trackId} at ${trackTimestamp}s`)
    } else {
      // Update existing in-memory ActiveMinute with new track info
      setState({
        currentActiveMinute: {
          ...state.currentActiveMinute!,
          track_id: trackId,
          track_timestamp_ms: trackTimestamp * 1000,
        }
      })
      console.log(`[ActiveMinute] Updated in-memory minute for track ${trackId} at ${trackTimestamp}s`)
    }
  }

  const destroyCurrentActiveMinute = () => {
    if (state.currentActiveMinute) {
      console.log(`[ActiveMinute] Discarded incomplete minute ${state.currentActiveMinute.activeminute_timestamp_ms}`)
      setState({ currentActiveMinute: null })
    }
  }

  const getSavedTrackTimestamp = (trackId: string): number => {
    // Get all ActiveMinutes for this track (persisted + current in-memory)
    const allActiveMinutes = [...state.activeMinutes]
    if (state.currentActiveMinute && state.currentActiveMinute.track_id === trackId) {
      allActiveMinutes.push(state.currentActiveMinute)
    }
    
    // Find the most recent ActiveMinute for this track (by activeminute_timestamp_ms)
    const trackActiveMinutes = allActiveMinutes
      .filter(am => am.track_id === trackId)
      .sort((a, b) => b.activeminute_timestamp_ms - a.activeminute_timestamp_ms)
    
    if (trackActiveMinutes.length > 0) {
      return trackActiveMinutes[0].track_timestamp_ms / 1000 // Convert back to seconds
    }
    
    return 0
  }

  const clearTrackTimestamp = (trackId: string) => {
    // Remove all persisted ActiveMinutes for this track
    setState('activeMinutes', (prev) => prev.filter(am => am.track_id !== trackId))
    
    // Clear current active minute if it's for this track
    if (state.currentActiveMinute?.track_id === trackId) {
      setState({ currentActiveMinute: null })
    }
  }

  const saveTrackTimestamp = (trackId: string, timestamp: number) => {
    // Only save if timestamp is significant (more than 5 seconds and not near the end)
    if (timestamp > 5 && timestamp < state.duration - 10) {
      ensureActiveMinuteForCurrentTime(trackId, timestamp)
    }
  }

  const restoreLastPlayedTrack = () => {
    // Get all ActiveMinutes (persisted + current in-memory)
    const allActiveMinutes = [...state.activeMinutes]
    if (state.currentActiveMinute) {
      allActiveMinutes.push(state.currentActiveMinute)
    }
    
    if (allActiveMinutes.length === 0) {
      console.log('[Player] No active minutes to restore from')
      return
    }
    
    // Sort by activeminute_timestamp_ms descending to get the most recent
    const mostRecentActiveMinute = allActiveMinutes
      .sort((a, b) => b.activeminute_timestamp_ms - a.activeminute_timestamp_ms)[0]
    
    const trackId = mostRecentActiveMinute.track_id
    const track = entities.tracks[trackId]
    
    if (!track) {
      console.log(`[Player] Track ${trackId} from most recent active minute not found in library`)
      return
    }

    // Get all tracks from the library
    const allTracks = Object.values(entities.tracks)
    const allTrackIds = allTracks.map(t => t.id)
    
    // Find the index of the track
    const trackIndex = allTrackIds.indexOf(trackId)
    
    if (trackIndex === -1) {
      console.log(`[Player] Track ${trackId} not found in track list`)
      return
    }

    console.log(`[Player] Restoring from most recent active minute: ${track.name}`)
    
    // Initialize the player with the track but don't start playing
    batch(() => {
      setState({
        trackIds: allTrackIds,
        activeTrackIndex: trackIndex,
        // Get saved timestamp for this track
        currentTime: getSavedTrackTimestamp(trackId),
        currentTimeChanged: true,
        // Don't auto-play, just prepare the track
        isPlaying: false,
      })
    })
  }

  // TODO. This is broken.
  createEffect(() => {
    const { tracks } = entities
    untrack(() => {
      const { activeTrackId } = state

      const filterIds = (trackIdsInQueue: readonly string[]) =>
        trackIdsInQueue.filter((trackId) => tracks[trackId])

      setState('trackIds', filterIds)
      setState('originalTrackIds', filterIds)
      // Active track index might have changed if some tracks were removed.
      setState('activeTrackIndex', state.trackIds.indexOf(activeTrackId))
    })
  })

  // Auto-restore last played track when entities are loaded
  createEffect(() => {
    const { tracks } = entities
    const { activeMinutes, currentActiveMinute } = state
    
    // Only restore if we have tracks, some active minutes, and no active track yet
    if (Object.keys(tracks).length > 0 && (activeMinutes.length > 0 || currentActiveMinute) && state.activeTrackIndex === -1) {
      console.log('[Player] Entities loaded, attempting to restore from active minutes')
      restoreLastPlayedTrack()
    }
  })

  const actions = {
    play,
    pause,
    playPause,
    playTrack,
    playNextTrack,
    playPreveousTrack,
    addTracksToQueue,
    removeFromQueue,
    clearQueue,
    toggleShuffle,
    toggleMute,
    toggleRepeat,
    setCurrentTime,
    changeCurrentTime,
    setDuration,
    setVolume,
    addToQueue,
    saveTrackTimestamp,
    getSavedTrackTimestamp,
    clearTrackTimestamp,
    restoreLastPlayedTrack,
    ensureActiveMinuteForCurrentTime,
    destroyCurrentActiveMinute,
  }

  const persistedItems = [
    {
      key: 'player-volume',
      selector: () => state.volume,
      load: (volume: number) => setState({ volume }),
    },
    {
      key: 'player-is-muted',
      selector: () => state.isMuted,
      load: (isMuted: boolean) => setState({ isMuted }),
    },
    {
      key: 'player-shuffle',
      selector: () => state.shuffle,
      load: (shuffle: State['shuffle']) => setState({ shuffle }),
    },
    {
      key: 'player-repeat',
      selector: () => state.repeat,
      load: (repeat: State['repeat']) => setState({ repeat }),
    },
    {
      key: 'player-active-minutes',
      selector: () => state.activeMinutes,
      load: (activeMinutes: ActiveMinute[]) => setState({ activeMinutes }),
    },
  ]

  return [state, actions, persistedItems] as const
}
