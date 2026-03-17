import { getAllBookmarks } from '$lib/db/bookmarks.ts'
import type { Bookmark } from '$lib/db/database.ts'
import { getLibraryItemIdFromUuid } from '$lib/library/get/ids.ts'
import { getLibraryValue, type TrackData } from '$lib/library/get/value.ts'

export interface BookmarkItem {
	bookmark: Bookmark
	track: TrackData
	trackId: number
}

const matchesSearchTerm = (item: BookmarkItem, searchTerm: string) => {
	if (!searchTerm) {
		return true
	}

	const normalizedSearchTerm = searchTerm.trim().toLowerCase()
	if (!normalizedSearchTerm) {
		return true
	}

	return (
		item.track.name.toLowerCase().includes(normalizedSearchTerm) ||
		item.track.album.toLowerCase().includes(normalizedSearchTerm) ||
		item.bookmark.note.toLowerCase().includes(normalizedSearchTerm)
	)
}

export const getBookmarkItems = async (searchTerm = ''): Promise<BookmarkItem[]> => {
	const bookmarks = await getAllBookmarks()
	const items = await Promise.all(
		bookmarks.map(async (bookmark) => {
			const trackId = await getLibraryItemIdFromUuid('tracks', bookmark.trackUuid)
			if (!trackId) {
				return null
			}

			const track = await getLibraryValue('tracks', trackId, true)
			if (!track) {
				return null
			}

			return {
				bookmark,
				track,
				trackId,
			} satisfies BookmarkItem
		}),
	)

	return items.filter((item): item is BookmarkItem => !!item).filter((item) => matchesSearchTerm(item, searchTerm))
}
