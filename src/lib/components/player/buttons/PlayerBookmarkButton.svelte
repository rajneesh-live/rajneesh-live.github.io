<script lang="ts">
	import IconButton from '$lib/components/IconButton.svelte'
	import { createBookmark } from '$lib/db/bookmarks.ts'
	import { snackbar } from '$lib/components/snackbar/snackbar.ts'

	const main = useMainStore()
	const player = usePlayer()
	const track = $derived(player.activeTrack)

	const saveBookmark = async (event: MouseEvent) => {
		event.stopPropagation()
		if (!track) {
			return
		}

		try {
			const bookmark = await createBookmark({
				trackUuid: track.uuid,
				timestampSeconds: player.currentTime,
			})
			main.bookmarkDialogOpen = {
				bookmarkId: bookmark.id!,
			}
		} catch (error) {
			snackbar.unexpectedError(error)
		}
	}
</script>

<IconButton
	icon="bookmark"
	tooltip={m.playerSaveBookmark()}
	disabled={!track}
	onclick={saveBookmark}
/>
