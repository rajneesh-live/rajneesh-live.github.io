<script lang="ts">
	import { goto } from '$app/navigation'
	import IconButton from '$lib/components/IconButton.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import { getDatabase } from '$lib/db/database.ts'
	import { createQuery } from '$lib/db/query/query.ts'
	import { dbGetAlbumTracksIdsByName, getLibraryItemIdFromUuid } from '$lib/library/get/ids.ts'
	import { getLibraryValue, type TrackData } from '$lib/library/get/value.ts'
	import type { Album } from '$lib/library/types.ts'
	import ContinueListeningCard from '$lib/rajneesh/components/ContinueListeningCard.svelte'
	import InstallAppBanner from '$lib/rajneesh/components/InstallAppBanner.svelte'

	const player = usePlayer()
	const menu = useMenu()

	type ResumeCardData = {
		track: TrackData
		album: Album | undefined
		albumTrackIds: number[]
		trackId: number
		lastPlayedAt: number
	}

	const latestResumeQuery = createQuery({
		key: [],
		fetcher: async (): Promise<ResumeCardData[]> => {
			const db = await getDatabase()
			const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
			const tx = db.transaction('activeMinutes')
			const index = tx.store.index('activeMinuteTimestampMs')
			const minutes = []

			for await (const cursor of index.iterate(IDBKeyRange.lowerBound(cutoff))) {
				minutes.push(cursor.value)
			}

			const latestByTrack = new Map<string, (typeof minutes)[number]>()
			for (const minute of minutes) {
				const existing = latestByTrack.get(minute.trackId)
				if (!existing || minute.activeMinuteTimestampMs > existing.activeMinuteTimestampMs) {
					latestByTrack.set(minute.trackId, minute)
				}
			}

			const resolvedTracks = await Promise.all(
				Array.from(latestByTrack.values()).map(async (minute) => {
					const trackId = await getLibraryItemIdFromUuid('tracks', minute.trackId)
					if (!trackId) {
						return null
					}

					const track = await getLibraryValue('tracks', trackId, true)
					if (!track) {
						return null
					}

					return {
						track,
						trackId,
						lastPlayedAt: minute.activeMinuteTimestampMs,
					}
				}),
			)

			const latestByAlbum = new Map<string, (typeof resolvedTracks)[number]>()
			for (const item of resolvedTracks) {
				if (!item) {
					continue
				}

				const albumName = item.track.album
				const existing = latestByAlbum.get(albumName)
				if (!existing || item.lastPlayedAt > existing.lastPlayedAt) {
					latestByAlbum.set(albumName, item)
				}
			}

			const cards = await Promise.all(
				Array.from(latestByAlbum.values()).map(async (item) => {
					if (!item) {
						return null
					}

					const [album, albumTrackIds] = await Promise.all([
						db.getFromIndex('albums', 'name', item.track.album),
						dbGetAlbumTracksIdsByName(item.track.album),
					])

					return {
						track: item.track,
						trackId: item.trackId,
						lastPlayedAt: item.lastPlayedAt,
						album,
						albumTrackIds,
					}
				}),
			)

			return cards
				.filter((card): card is ResumeCardData => !!card)
				.sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)
		},
		onDatabaseChange: (changes, { refetch }) => {
			for (const change of changes) {
				if (
					change.storeName === 'activeMinutes' ||
					change.storeName === 'tracks' ||
					change.storeName === 'albums'
				) {
					void refetch()
					break
				}
			}
		},
	})

	const resumeCards = $derived(latestResumeQuery.value ?? [])

	const resume = (card: ResumeCardData) => {
		const { albumTrackIds, trackId } = card
		if (albumTrackIds.length > 0) {
			const startIndex = albumTrackIds.indexOf(trackId)
			if (startIndex >= 0) {
				player.playTrack(startIndex, albumTrackIds)
				return
			}
		}

		player.playTrack(0, [trackId])
	}

	const openExploreSearch = () => {
		void goto('/library/explore?focus=1')
	}

	$effect(() => {
		const firstCard = resumeCards[0]
		if (!firstCard || !player.isQueueEmpty) {
			return
		}

		const { albumTrackIds, trackId } = firstCard
		if (albumTrackIds.length > 0) {
			const startIndex = albumTrackIds.indexOf(trackId)
			player.prepareTrack(Math.max(0, startIndex), albumTrackIds)
			return
		}

		player.prepareTrack(0, [trackId])
	})
</script>

{#snippet searchBar()}
	<div
		class="@container sticky top-2 z-1 mt-2 mb-4 ml-auto flex w-full max-w-125 items-center gap-1 rounded-lg border border-primary/10 bg-surfaceContainerHighest px-2 @sm:gap-2"
	>
		<input
			type="text"
			name="search"
			placeholder={m.librarySearch()}
			class="h-12 w-60 grow bg-transparent pl-2 text-body-md placeholder:text-onSurface/54 focus:outline-none"
			onfocus={openExploreSearch}
			onclick={openExploreSearch}
		/>

		<Separator vertical class="my-auto hidden h-6 @sm:flex" />

		<IconButton
			ariaLabel={m.libraryOpenApplicationMenu()}
			tooltip={m.libraryOpenApplicationMenu()}
			icon="moreVertical"
			onclick={(e) => {
				const menuItems = [
					{
						label: m.settings(),
						action: () => {
							goto('/settings')
						},
					},
					{
						label: m.about(),
						action: () => {
							goto('/about')
						},
					},
				]

				menu.showFromEvent(e, menuItems, {
					width: 200,
					anchor: true,
					preferredAlignment: {
						vertical: 'top',
						horizontal: 'right',
					},
				})
			}}
		/>
	</div>
{/snippet}

{#if resumeCards.length > 0}
	<div class="flex grow flex-col px-4 pb-4">
		{@render searchBar()}
		<InstallAppBanner class="mb-4" />

		<section class="relative grid w-full gap-4 overflow-clip py-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each resumeCards as card (card.trackId)}
				<ContinueListeningCard card={card} onResume={() => resume(card)} />
			{/each}
		</section>
	</div>
{:else}
	<div class="flex grow flex-col px-4 pb-4">
		{@render searchBar()}
		<InstallAppBanner class="mb-4" />

		<div class="flex h-full flex-col items-center justify-center gap-4 text-center">
			<Icon type="home" class="size-24 opacity-20" />
			<h1 class="text-headline-lg font-bold">Welcome</h1>
		</div>
	</div>
{/if}
