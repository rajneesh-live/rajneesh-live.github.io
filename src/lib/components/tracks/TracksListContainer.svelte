<script lang="ts" module>
	import type { TrackData } from '$lib/library/get/value.ts'
	import { toggleWatchLaterTrack } from '$lib/library/playlists-actions'
	import { canPlayTrackFile } from '$lib/rajneesh/hooks/can-play-track.ts'
	import {
		ensureCompletedTracksLoaded,
		isTrackCompleted,
		markTrackCompleted,
		unmarkTrackCompleted,
	} from '$lib/stores/completed-tracks.svelte.ts'
	import type { MenuItem } from '../ListItem.svelte'
	import VirtualContainer from '../VirtualContainer.svelte'
	import TrackListItem from './TrackListItem.svelte'

	export type PredefinedTrackMenuItems =
		| 'addToQueue'
		| 'addToPlaylist'
		| 'removeFromLibrary'
		| 'addToWatchLater'
		| 'toggleCompleted'
		| 'viewAlbum'
		| 'viewArtist'

	export interface TrackItemClick {
		track: TrackData
		items: readonly number[]
		index: number
	}
</script>

<script lang="ts">
	const player = usePlayer()

	const defaultOnItemClick = (data: TrackItemClick) => {
		player.playTrack(data.index, data.items)
	}

	interface Props {
		items: readonly number[]
		predefinedMenuItems?: Partial<Record<PredefinedTrackMenuItems, boolean>>
		menuItems?: (track: TrackData, index: number) => MenuItem[]
		onItemClick?: (data: TrackItemClick) => void
	}

	const {
		items,
		menuItems,
		predefinedMenuItems = {},
		onItemClick = defaultOnItemClick,
	}: Props = $props()

	$effect(() => {
		void ensureCompletedTracksLoaded()
	})

	interface PredefinedMenuItem extends MenuItem {
		predefinedKey: PredefinedTrackMenuItems
	}

	const getMenuItems = (track: TrackData, index: number) => {
		type FalsyValue = false | undefined | null | ''
		const predefinedMenuItemsList: (PredefinedMenuItem | FalsyValue)[] = [
			{
				predefinedKey: 'addToQueue',
				label: m.playerAddToQueue(),
				action: () => {
					player.addToQueue(track.id)
				},
			},
			{
				predefinedKey: 'addToWatchLater',
				label: track.watchLater ? m.trackRemoveFromWatchLater() : m.trackAddToWatchLater(),
				action: async () => {
					await toggleWatchLaterTrack(track.watchLater, track.id)
				},
			},
			{
				predefinedKey: 'toggleCompleted',
				label: isTrackCompleted(track.uuid)
					? m.libraryMarkTrackIncomplete()
					: m.libraryMarkTrackCompleted(),
				action: async () => {
					if (isTrackCompleted(track.uuid)) {
						await unmarkTrackCompleted(track.uuid)
					} else {
						await markTrackCompleted(track.uuid)
					}
				},
			},
		]

		const predefinedItems = predefinedMenuItemsList.filter((item) => {
			if (!item) {
				return false
			}

			// By default, all predefined menu items are enabled.
			const isExplicitlyDisabled = predefinedMenuItems[item.predefinedKey] === false

			return !isExplicitlyDisabled
		}) as MenuItem[]

		return [...predefinedItems, ...(menuItems?.(track, index) ?? [])]
	}
</script>

<VirtualContainer size={72} count={items.length} key={(index) => `${items[index]}-${index}`}>
	{#snippet children(item)}
		{@const trackId = items[item.index] as number}

		<TrackListItem
			{trackId}
			active={player.activeTrack?.id === trackId}
			style="transform: translateY({item.start}px)"
			class="virtual-item top-0 left-0 w-full"
			ariaRowIndex={item.index}
			menuItems={(track) => getMenuItems(track, item.index)}
			onclick={async (track) => {
				if (!(await canPlayTrackFile(track.file, track.uuid))) {
					return
				}

				onItemClick({
					track,
					items,
					index: item.index,
				})
			}}
		/>
	{/snippet}
</VirtualContainer>
