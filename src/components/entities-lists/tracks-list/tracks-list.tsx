import {
  createMemo,
  createSignal,
  JSXElement,
  Show,
  VoidComponent,
  createEffect,
} from 'solid-js'
import { useNavigate } from 'solid-app-router'
import {
  VirtualContainer,
  VirtualItemProps,
} from '@minht11/solid-virtual-container'
import { Track } from '../../../types/types'
import { clx, formatTime, pluralize, useResizeObserver } from '../../../utils'
import { MusicImage } from '../../music-image/music-image'
import { MenuItem } from '../../menu/menu'
import { useEntitiesStore, usePlayerStore } from '../../../stores/stores'
import { useModals } from '../../modals/modals'
import { ListItem } from '~/components/list-item/listi-tem'
import { isUrlCached, downloadAudio } from '../../../audio/audio-cache'
import { toast } from '~/components/toast/toast'
import * as styles from './tracks-list.css'

const UNKNOWN_ITEM_STRING = '<unknown>'

type EntitiesActions = ReturnType<typeof useEntitiesStore>[1]

export interface TracksListProps {
  items: readonly string[]
  fallback?: JSXElement
  onItemClick?: (item: Track, index: number) => void
  showIndex?: boolean
  isPlayingItem?: (item: Track, index: number) => boolean
  // TODO: Menu handling needs rewriting. One possible solution is predefined
  // options list.
  additionalMenuItems?: (item: Track, actions: EntitiesActions) => MenuItem[]
}

interface TracksListItemProps extends VirtualItemProps<string> {
  class: string
  showIndex?: boolean
  onItemClick?: (item: Track, index: number) => void
  isPlayingItem?: (item: Track, index: number) => boolean
  additionalMenuItems?: (item: Track, actions: EntitiesActions) => MenuItem[]
}

const artistsToString = (artists: readonly string[]) =>
  artists.length ? artists.join(', ') : UNKNOWN_ITEM_STRING

const TrackListItem: VoidComponent<TracksListItemProps> = (props) => {
  const navigate = useNavigate()
  const modals = useModals()
  const [entities, entitiesActions] = useEntitiesStore()
  const [, playerActions] = usePlayerStore()

  const [playerState] = usePlayerStore()

  const track = () => entities.tracks[props.item] as Track

  // Check if track is cached
  const [isCached, setIsCached] = createSignal(false)
  const [cacheCheckTrigger, setCacheCheckTrigger] = createSignal(0)
  
  createEffect(() => {
    // Re-run when track changes or when manually triggered
    cacheCheckTrigger()
    
    const trackItem = track()
    if (!trackItem?.fileWrapper || trackItem.fileWrapper.type !== 'url') {
      setIsCached(false)
      return
    }
    
    // Check cache status for URL-based tracks
    isUrlCached(trackItem.fileWrapper.url)
      .then(setIsCached)
      .catch((error) => {
        console.error('Error checking cache status:', error)
        setIsCached(false)
      })
  })
  
  // Function to manually refresh cache status
  const refreshCacheStatus = () => {
    setCacheCheckTrigger(prev => prev + 1)
  }

  const getTrackProgressTime = (trackId: string) => {
    const { activeMinutes, currentActiveMinute } = playerState
    const trackItem = track()
    
    if (!trackItem) return null
    
    // Get all active minutes for this track (persisted + current in-memory)
    const allActiveMinutes = [...activeMinutes]
    if (currentActiveMinute && currentActiveMinute.track_id === trackId) {
      allActiveMinutes.push(currentActiveMinute)
    }
    
    const trackActiveMinutes = allActiveMinutes
      .filter(am => am.track_id === trackId)
      .sort((a, b) => b.activeminute_timestamp_ms - a.activeminute_timestamp_ms)
    
    if (trackActiveMinutes.length === 0) return null
    
    const timestamp = trackActiveMinutes[0].track_timestamp_ms / 1000 // Convert to seconds
    return timestamp
  }

  const getTimeDisplay = () => {
    const trackItem = track()
    const currentPosition = getTrackProgressTime(trackItem.id)
    
    if (currentPosition !== null && currentPosition > 0) {
      return `${formatTime(currentPosition)}/${formatTime(trackItem.duration)}`
    }
    
    return formatTime(trackItem.duration)
  }

  const getMenuItems = () => {
    const trackItem = track()
    const { artists, id: trackId } = trackItem

    const isFavorited = entities.favorites.includes(trackId)

    const menuItems = [
      {
        name: 'Add to queue',
        action: () => {
          playerActions.addToQueue([trackId])
        },
      },
      artists.length && {
        name: `View ${pluralize(artists.length, 'artist')}`,
        action: () => {
          if (artists.length > 1) {
            modals.viewArtists.show({ artistsIds: trackItem.artists })
          } else {
            navigate(`/artist/${artists[0]}`)
          }
        },
      },
      trackItem.album && {
        name: 'View album',
        action: () => {
          navigate(`/album/${trackItem.album || ''}`)
        },
      },
      {
        name: isFavorited ? 'Remove from Favorites' : 'Add to Favorites',
        action: () => {
          if (isFavorited) {
            entitiesActions.unfavoriteTrack(trackId)
          } else {
            entitiesActions.favoriteTrack(trackId)
          }
        },
      },
      {
        name: 'Add to playlist',
        action: () => {
          modals.addToPlaylists.show({ trackIds: [trackId] })
        },
      },
      // Add Download option for URL-based tracks
      trackItem.fileWrapper?.type === 'url' && {
        name: isCached() === true ? 'Downloaded ☑' : 'Download',
        action: async () => {
          if (isCached() !== true && trackItem.fileWrapper?.type === 'url') {
            try {
              console.log(`[Download] Starting download for: ${trackItem.name}`)
              
              // Show loading toast
              const toastId = toast({
                id: `download-${trackId}`,
                message: `Downloading "${trackItem.name}"...`,
                controls: 'spinner',
                duration: false,
              })
              
              await downloadAudio(trackItem.fileWrapper.url)
              console.log(`[Download] Successfully downloaded: ${trackItem.name}`)
              
              // Refresh cache status to update UI immediately
              refreshCacheStatus()
              
              // Dismiss loading toast and show success
              toast.dismiss(toastId)
              toast({
                message: `✓ Downloaded "${trackItem.name}"`,
                duration: 4000,
              })
            } catch (error) {
              console.error(`[Download] Failed to download: ${trackItem.name}`, error)
              
              // Dismiss loading toast and show error
              toast.dismiss(`download-${trackId}`)
              toast({
                message: `✗ Failed to download "${trackItem.name}"`,
                duration: 6000,
              })
            }
          }
        },
        disabled: isCached() === true,
      },
      ...(props.additionalMenuItems?.(track(), entitiesActions) || []),
      {
        name: 'Remove from the library',
        action: () => {
          entitiesActions.removeTracks([trackId])
        },
      },
    ] as MenuItem[]

    return menuItems
  }

  const onClickHandler = () => {
    const { index } = props

    if (props.onItemClick) {
      props.onItemClick(track(), index)
    } else {
      // Default click action.
      playerActions.playTrack(index, props.items)
    }
  }

  const isItemPlaying = createMemo(() => {
    const { isPlayingItem } = props
    if (isPlayingItem) {
      return isPlayingItem(track(), props.index)
    }

    return playerState.activeTrack === track()
  })

  return (
    <ListItem
      isSelected={isItemPlaying()}
      onClick={onClickHandler}
      style={props.style}
      tabIndex={props.tabIndex}
      class={props.class}
      icon={
        <Show
          when={!props.showIndex}
          fallback={<div class={styles.firstColumn}>{props.index + 1}</div>}
        >
          <MusicImage
            item={track()}
            class={clx(styles.firstColumn, styles.artwork)}
          />
        </Show>
      }
      text={track().name}
      secondaryText={`${isCached() === true ? '☑ ' : ''}${artistsToString(track().artists)}`}
      trailing={
        <>
          <div class={styles.album}>{track().album || UNKNOWN_ITEM_STRING}</div>

          <div class={styles.time}>{getTimeDisplay()}</div>
        </>
      }
      getMenuItems={getMenuItems}
    />
  )
}

const TracksListContent: VoidComponent<TracksListProps> = (props) => {
  const [isWide, setIsWide] = createSignal(false)
  const [isNarrow, setIsNarrow] = createSignal(false)

  let containerEl!: HTMLDivElement
  useResizeObserver(
    () => containerEl,
    (entry) => {
      setIsWide(entry.contentRect.width > 800)
      setIsNarrow(entry.contentRect.width < 440)
    },
  )

  return (
    <div ref={containerEl} class={styles.container}>
      <VirtualContainer itemSize={{ height: 68 }} items={props.items}>
        {(itemProps) => (
          <TrackListItem
            {...itemProps}
            class={clx(
              !isWide() && styles.compact,
              isNarrow() && styles.narrow,
            )}
            isPlayingItem={props.isPlayingItem}
            onItemClick={props.onItemClick}
            showIndex={props.showIndex}
            additionalMenuItems={props.additionalMenuItems}
          />
        )}
      </VirtualContainer>
    </div>
  )
}

export const TracksList: VoidComponent<TracksListProps> = (props) => (
  <Show when={props.items.length} fallback={props.fallback}>
    <TracksListContent {...props} />
  </Show>
)
