<script lang="ts">
	import { page } from '$app/state'
	import { goto } from '$app/navigation'
	import { getBookmarkItems } from '$lib/bookmarks/bookmark-items.ts'
	import BookmarkListItem from '$lib/bookmarks/BookmarkListItem.svelte'
	import { playBookmark } from '$lib/bookmarks/play-bookmark.ts'
	import { shareBookmark } from '$lib/bookmarks/share.ts'
	import { deleteBookmark } from '$lib/db/bookmarks.ts'
	import { createQuery } from '$lib/db/query/query.ts'
	import Button from '$lib/components/Button.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import { getLibraryItemIdFromUuid } from '$lib/library/get/ids.ts'
	import {
		getPlaylistTrackIds,
		WATCH_LATER_PLAYLIST_ID,
	} from '$lib/library/playlists-actions.ts'
	import { WATCH_LATER_PLAYLIST_UUID } from '$lib/library/types.ts'
	import { snackbar } from '$lib/components/snackbar/snackbar.ts'

	interface Props {
		searchTerm: string
	}

	const { searchTerm }: Props = $props()

	const main = useMainStore()
	const player = usePlayer()

	const bookmarksQuery = createQuery({
		key: () => [searchTerm],
		fetcher: ([term]) => getBookmarkItems(term),
		onDatabaseChange: (changes, { refetch }) => {
			for (const change of changes) {
				if (change.storeName === 'bookmarks' || change.storeName === 'tracks') {
					void refetch()
					return
				}
			}
		},
	})

	const watchLaterQuery = createQuery({
		key: [],
		fetcher: () => getPlaylistTrackIds(WATCH_LATER_PLAYLIST_ID),
		onDatabaseChange: (changes, { refetch }) => {
			for (const change of changes) {
				if (
					change.storeName === 'playlistEntries' &&
					change.value.playlistId === WATCH_LATER_PLAYLIST_ID
				) {
					void refetch()
					return
				}
			}
		},
	})

	const bookmarkItems = $derived(bookmarksQuery.value ?? [])
	const watchLaterTrackIds = $derived(watchLaterQuery.value ?? [])

	let restoredSharedTrack = $state(false)
	$effect(() => {
		if (restoredSharedTrack) {
			return
		}

		const trackUuid = page.url.searchParams.get('track')
		const timestamp = Number(page.url.searchParams.get('t') ?? '')
		if (!trackUuid || !Number.isFinite(timestamp)) {
			return
		}

		restoredSharedTrack = true
		void getLibraryItemIdFromUuid('tracks', trackUuid).then((trackId) => {
			if (!trackId) {
				return
			}

			player.playTrackAtTime(0, timestamp, [trackId])
			void goto('/library/bookmarks', {
				replaceState: true,
				noScroll: true,
			})
		})
	})

	const editBookmark = (bookmarkId: number) => {
		main.bookmarkDialogOpen = { bookmarkId }
	}

	const removeBookmark = async (bookmarkId: number) => {
		try {
			await deleteBookmark(bookmarkId)
		} catch (error) {
			snackbar.unexpectedError(error)
		}
	}

	const openWatchLater = () => {
		void goto(`/library/bookmarks/${WATCH_LATER_PLAYLIST_UUID}`)
	}
</script>

<div class="flex grow flex-col gap-6 pb-6">
	<section class="grid gap-3">
		<Button
			kind="blank"
			class="w-full rounded-2xl border border-primary/10 bg-surfaceContainer px-4 py-5!"
			onclick={openWatchLater}
		>
			<div class="flex w-full items-center gap-3 text-left">
				<div class="flex size-10 items-center justify-center rounded-full bg-surfaceContainerHighest text-onSurfaceVariant">
					<Icon type="playlist" />
				</div>

				<div class="grid min-w-0 flex-1 gap-1">
					<div class="text-title-md">{m.watchLater()}</div>
					<div class="text-body-md text-onSurfaceVariant">
						{watchLaterTrackIds.length > 0
							? m.libraryTracksCount({ count: watchLaterTrackIds.length })
							: m.noItemsToDisplay()}
					</div>
				</div>

				<Icon type="chevronRight" class="text-onSurfaceVariant" />
			</div>
		</Button>
	</section>

	<section class="grid gap-3">
		<div class="flex items-center gap-2">
			<Icon type="bookmark" class="size-5 text-onSurfaceVariant" />
			<h2 class="text-title-lg">{m.bookmarks()}</h2>
		</div>

		{#if bookmarkItems.length > 0}
			<div class="overflow-hidden rounded-2xl border border-primary/10 bg-surfaceContainer">
				{#each bookmarkItems as item (item.bookmark.id)}
					<BookmarkListItem
						{item}
						onPlay={() => playBookmark(player, item)}
						onShare={() => void shareBookmark(item)}
						onEdit={() => editBookmark(item.bookmark.id!)}
						onDelete={() => void removeBookmark(item.bookmark.id!)}
					/>
				{/each}
			</div>
		{:else}
			<div class="rounded-2xl border border-primary/10 bg-surfaceContainer px-4 py-8 text-center">
				<div class="mb-2 text-title-md">{m.bookmarkEmptyTitle()}</div>
				<div class="text-body-md text-onSurfaceVariant">{m.bookmarkEmptyDescription()}</div>
			</div>
		{/if}
	</section>
</div>
