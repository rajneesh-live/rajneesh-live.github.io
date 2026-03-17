import { snackbar } from '$lib/components/snackbar/snackbar.ts'
import { formatDuration } from '$lib/helpers/utils/format-duration.ts'
import type { BookmarkItem } from './bookmark-items.ts'

export const getBookmarkShareUrl = (item: BookmarkItem): string => {
	const url = new URL('/library/bookmarks', window.location.origin)
	url.searchParams.set('track', item.bookmark.trackUuid)
	url.searchParams.set('t', `${item.bookmark.timestampSeconds}`)

	return url.toString()
}

const getBookmarkShareText = (item: BookmarkItem): string => {
	const parts = [item.track.name, formatDuration(item.bookmark.timestampSeconds)]
	if (item.bookmark.note) {
		parts.push(item.bookmark.note)
	}

	return parts.join(' - ')
}

export const shareBookmark = async (item: BookmarkItem): Promise<void> => {
	const url = getBookmarkShareUrl(item)
	const text = getBookmarkShareText(item)
	const shareData = {
		title: item.track.name,
		text,
		url,
	}

	if (navigator.share) {
		try {
			await navigator.share(shareData)
			return
		} catch (error) {
			if ((error as Error).name === 'AbortError') {
				return
			}
		}
	}

	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(`${text}\n${url}`)
		snackbar({
			id: `bookmark-link-copied-${item.bookmark.id}`,
			message: m.bookmarkLinkCopied(),
		})
	}
}
