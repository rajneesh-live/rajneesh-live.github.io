<script lang="ts">
	import { goto } from '$app/navigation'
	import IconButton from '$lib/components/IconButton.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import { getBookmarkItems } from '$lib/bookmarks/bookmark-items.ts'
	import { playBookmark } from '$lib/bookmarks/play-bookmark.ts'
	import { shareBookmark } from '$lib/bookmarks/share.ts'
	import { getDatabase } from '$lib/db/database.ts'
	import { createQuery } from '$lib/db/query/query.ts'
	import { dbGetAlbumTracksIdsByName, getLibraryItemIdFromUuid } from '$lib/library/get/ids.ts'
	import { getLibraryValue, type TrackData } from '$lib/library/get/value.ts'
	import type { Album } from '$lib/library/types.ts'
	import BookmarkCard from '$lib/rajneesh/components/BookmarkCard.svelte'
	import ContinueListeningCard from '$lib/rajneesh/components/ContinueListeningCard.svelte'
	import InstallAppBanner from '$lib/rajneesh/components/InstallAppBanner.svelte'

	const player = usePlayer()
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
	const bookmarkCardsQuery = createQuery({
		key: [],
		fetcher: () => getBookmarkItems(),
		onDatabaseChange: (changes, { refetch }) => {
			for (const change of changes) {
				if (change.storeName === 'bookmarks' || change.storeName === 'tracks') {
					void refetch()
					break
				}
			}
		},
	})
	const bookmarkCards = $derived((bookmarkCardsQuery.value ?? []).slice(0, 6))
	const hasHomeContent = $derived(resumeCards.length > 0 || bookmarkCards.length > 0)

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
		class="@container sticky top-2 z-1 mt-2 mb-4 flex w-full items-center gap-1 rounded-lg border border-primary/10 bg-surfaceContainerHighest px-2 @sm:gap-2"
	>
		<input
			type="text"
			name="search"
			placeholder={m.librarySearch()}
			class="h-12 min-w-0 flex-1 bg-transparent pl-2 text-body-md placeholder:text-onSurface/54 focus:outline-none"
			onfocus={openExploreSearch}
			onclick={openExploreSearch}
		/>

		<Separator vertical class="my-auto hidden h-6 @sm:flex" />

		<IconButton
			ariaLabel={m.settings()}
			tooltip={m.settings()}
			icon="settings"
			onclick={() => void goto('/settings')}
		/>
	</div>
{/snippet}

{#snippet devNote()}
	<button
		onclick={() => void goto('/settings')}
		class="mb-4 flex w-full items-center gap-3 rounded-xl border border-outlineVariant/50 px-4 py-3 text-left transition-colors hover:bg-surfaceContainerHigh"
	>
		<Icon type="information" class="size-5 shrink-0 opacity-70" />
		<span class="flex-1 text-body-sm opacity-80">
			App is in early development. Help us improve!
		</span>
		<Icon type="chevronRight" class="size-5 shrink-0 opacity-50" />
	</button>
{/snippet}

<div class="flex grow flex-col pb-4">
	{@render searchBar()}
	<InstallAppBanner class="mb-4" />
	{@render devNote()}

	{#if bookmarkCards.length > 0}
		<section class="py-3">
			<div class="mb-3 flex items-center gap-2">
				<Icon type="bookmark" class="size-5 text-onSurfaceVariant" />
				<h2 class="text-title-lg">{m.bookmarks()}</h2>
			</div>

			<div class="relative grid w-full gap-3 overflow-clip sm:grid-cols-2 lg:grid-cols-3">
				{#each bookmarkCards as item (item.bookmark.id)}
					<BookmarkCard
						{item}
						onPlay={() => playBookmark(player, item)}
						onShare={() => void shareBookmark(item)}
					/>
				{/each}
			</div>
		</section>
	{/if}

	{#if resumeCards.length > 0}
		<section class="py-4">
			<div class="mb-4 flex items-center gap-2">
				<Icon type="headphones" class="size-5 text-onSurfaceVariant" />
				<h2 class="text-title-lg">Continue listening</h2>
			</div>

			<div class="relative grid w-full gap-4 overflow-clip sm:grid-cols-2 lg:grid-cols-3">
				{#each resumeCards as card (card.trackId)}
					<ContinueListeningCard card={card} onResume={() => resume(card)} />
				{/each}
			</div>
		</section>
	{/if}

	{#if !hasHomeContent}
		<div class="flex h-full flex-col items-center justify-center gap-4 text-center">
			<Icon type="home" class="size-24 opacity-20" />
			<h1 class="text-headline-lg font-bold">Welcome</h1>
		</div>
	{/if}
</div>
