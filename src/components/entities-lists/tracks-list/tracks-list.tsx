import {
  createMemo,
  createSignal,
  createEffect,
  JSXElement,
  Show,
  VoidComponent,
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
import { toast } from '~/components/toast/toast'
import * as styles from './tracks-list.css'

// Rajneesh download integration
import {
  RAJNEESH_FLAGS,
  isUrlCached,
  downloadManager,
  getDownloadMenuText,
  isDownloadMenuDisabled,
} from '~/lib/rajneesh'

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

  // Download status tracking for FileRemote tracks
  const [isCached, setIsCached] = createSignal(false)
  const [isDownloading, setIsDownloading] = createSignal(false)
  const [downloadProgress, setDownloadProgress] = createSignal(0)

  // Check cache status when track changes
  createEffect(() => {
    const trackItem = track()
    if (!RAJNEESH_FLAGS.DOWNLOAD_UI || !trackItem?.fileWrapper) {
      return
    }

    if (trackItem.fileWrapper.type === 'remote') {
      isUrlCached(trackItem.fileWrapper.url)
        .then(setIsCached)
        .catch(() => setIsCached(false))
    }
  })

  // Subscribe to download progress
  createEffect(() => {
    const trackItem = track()
    if (!RAJNEESH_FLAGS.DOWNLOAD_UI || !trackItem) {
      return
    }

    const unsubscribe = downloadManager.subscribeToProgress((progress) => {
      if (progress.trackId === trackItem.id) {
        setIsDownloading(progress.state === 'downloading' || progress.state === 'pending')
        setDownloadProgress(progress.progress)

        if (progress.state === 'complete') {
          setIsCached(true)
          setIsDownloading(false)
        }
      }
    })

    return unsubscribe
  })

  // Handle download action
  const handleDownload = () => {
    const trackItem = track()
    if (trackItem.fileWrapper?.type === 'remote') {
      toast({
        message: `Downloading "${trackItem.name}"...`,
        duration: 3000,
      })
      downloadManager.download(trackItem.id, trackItem.fileWrapper.url)
    }
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
      // Download menu item for FileRemote tracks
      RAJNEESH_FLAGS.DOWNLOAD_UI &&
        trackItem.fileWrapper?.type === 'remote' && {
          name: getDownloadMenuText(isCached(), isDownloading(), downloadProgress()),
          action: handleDownload,
          disabled: isDownloadMenuDisabled(isCached()),
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
      secondaryText={
        RAJNEESH_FLAGS.DOWNLOAD_UI && isCached()
          ? `[cached] ${artistsToString(track().artists)}`
          : artistsToString(track().artists)
      }
      trailing={
        <>
          <div class={styles.album}>{track().album || UNKNOWN_ITEM_STRING}</div>

          <div class={styles.time}>{formatTime(track().duration)}</div>
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
