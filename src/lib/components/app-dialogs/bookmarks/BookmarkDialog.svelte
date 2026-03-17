<script lang="ts">
	import CommonDialog from '$lib/components/dialog/CommonDialog.svelte'
	import { deleteBookmark, getBookmark, updateBookmark } from '$lib/db/bookmarks.ts'
	import { createQuery } from '$lib/db/query/query.ts'
	import { getLibraryItemIdFromUuid } from '$lib/library/get/ids.ts'
	import { getLibraryValue } from '$lib/library/get/value.ts'
	import { formatDuration } from '$lib/helpers/utils/format-duration.ts'
	import { snackbar } from '$lib/components/snackbar/snackbar.ts'

	const main = useMainStore()

	const bookmarkId = $derived(main.bookmarkDialogOpen?.bookmarkId ?? -1)
	const bookmarkQuery = createQuery({
		key: () => [bookmarkId],
		fetcher: async ([id]) => {
			if (id < 0) {
				return null
			}

			return getBookmark(id)
		},
		onDatabaseChange: (changes, { refetch }) => {
			for (const change of changes) {
				if (change.storeName === 'bookmarks' && change.key === bookmarkId) {
					void refetch()
					return
				}
			}
		},
	})

	const trackQuery = createQuery({
		key: () => [bookmarkQuery.value?.trackUuid ?? ''],
		fetcher: async ([trackUuid]) => {
			if (!trackUuid) {
				return null
			}

			const trackId = await getLibraryItemIdFromUuid('tracks', trackUuid)
			if (!trackId) {
				return null
			}

			return getLibraryValue('tracks', trackId, true)
		},
		onDatabaseChange: (changes, { refetch }) => {
			for (const change of changes) {
				if (change.storeName === 'tracks') {
					void refetch()
					return
				}
			}
		},
	})

	let note = $state('')
	let hydratedBookmarkId = $state<number | null>(null)

	$effect(() => {
		const bookmark = bookmarkQuery.value
		if (!bookmark || bookmark.id === hydratedBookmarkId) {
			return
		}

		hydratedBookmarkId = bookmark.id ?? null
		note = bookmark.note
	})

	const closeDialog = () => {
		main.bookmarkDialogOpen = null
	}

	const saveBookmark = async () => {
		const bookmark = bookmarkQuery.value
		if (!bookmark?.id) {
			return
		}

		try {
			await updateBookmark(bookmark.id, {
				note,
			})
			closeDialog()
		} catch (error) {
			snackbar.unexpectedError(error)
		}
	}

	const removeBookmark = async () => {
		const bookmark = bookmarkQuery.value
		if (!bookmark?.id) {
			return
		}

		try {
			await deleteBookmark(bookmark.id)
		} catch (error) {
			snackbar.unexpectedError(error)
		}
	}
</script>

<CommonDialog
	open={{
		get: () => main.bookmarkDialogOpen,
		close: closeDialog,
	}}
	icon="bookmark"
	title={m.bookmarkEditTitle()}
	buttons={[
		{
			title: m.bookmarkDelete(),
			align: 'left',
			kind: 'flat',
			action: removeBookmark,
		},
		{
			title: m.libraryCancel(),
		},
		{
			title: m.librarySave(),
			type: 'submit',
		},
	]}
	onsubmit={saveBookmark}
>
	<div class="grid gap-4">
		<div class="grid gap-1">
			<div class="text-title-md text-onSurface">{trackQuery.value?.name ?? m.bookmark()}</div>
			{#if bookmarkQuery.value}
				<div class="text-body-md">{formatDuration(bookmarkQuery.value.timestampSeconds)}</div>
			{/if}
		</div>

		<label class="grid gap-2">
			<span class="text-body-md text-onSurface">{m.bookmarkNoteLabel()}</span>
			<textarea
				bind:value={note}
				name="note"
				rows="4"
				maxlength="280"
				placeholder={m.bookmarkNotePlaceholder()}
				class="min-h-28 resize-y rounded-md border border-outline bg-transparent px-3.5 py-3 text-onSurface outline-none focus:border-2 focus:border-primary"
			></textarea>
		</label>
	</div>
</CommonDialog>
