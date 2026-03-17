import type { Bookmark } from './database.ts'
import { getDatabase } from './database.ts'
import { dispatchDatabaseChangedEvent } from './events.ts'

export interface BookmarkDraft {
	trackUuid: string
	timestampSeconds: number
	note?: string
}

const normalizeTimestampSeconds = (timestampSeconds: number) => Math.max(0, Math.floor(timestampSeconds))

const normalizeNote = (note: string | undefined) => note?.trim() ?? ''

export const createBookmark = async (draft: BookmarkDraft): Promise<Bookmark> => {
	const db = await getDatabase()
	const now = Date.now()
	const value: Omit<Bookmark, 'id'> = {
		trackUuid: draft.trackUuid,
		timestampSeconds: normalizeTimestampSeconds(draft.timestampSeconds),
		note: normalizeNote(draft.note),
		createdAt: now,
		updatedAt: now,
	}

	const id = await db.add('bookmarks', value as Bookmark)
	const bookmark: Bookmark = {
		...value,
		id,
	}

	dispatchDatabaseChangedEvent({
		storeName: 'bookmarks',
		operation: 'add',
		key: id,
		value: bookmark,
	})

	return bookmark
}

export const getBookmark = async (bookmarkId: number): Promise<Bookmark | undefined> => {
	const db = await getDatabase()

	return db.get('bookmarks', bookmarkId)
}

export const getAllBookmarks = async (): Promise<Bookmark[]> => {
	const db = await getDatabase()
	const bookmarks = await db.getAllFromIndex('bookmarks', 'updatedAt')

	return bookmarks.reverse()
}

export const updateBookmark = async (
	bookmarkId: number,
	updates: Partial<Pick<Bookmark, 'timestampSeconds' | 'note'>>,
): Promise<Bookmark | undefined> => {
	const db = await getDatabase()
	const tx = db.transaction('bookmarks', 'readwrite')
	const existing = await tx.store.get(bookmarkId)
	if (!existing) {
		await tx.done
		return undefined
	}

	const bookmark: Bookmark = {
		...existing,
		timestampSeconds:
			updates.timestampSeconds === undefined
				? existing.timestampSeconds
				: normalizeTimestampSeconds(updates.timestampSeconds),
		note: updates.note === undefined ? existing.note : normalizeNote(updates.note),
		updatedAt: Date.now(),
	}

	await tx.store.put(bookmark)
	await tx.done

	dispatchDatabaseChangedEvent({
		storeName: 'bookmarks',
		operation: 'update',
		key: bookmarkId,
		value: bookmark,
	})

	return bookmark
}

export const deleteBookmark = async (bookmarkId: number): Promise<boolean> => {
	const db = await getDatabase()
	const existing = await db.get('bookmarks', bookmarkId)
	if (!existing) {
		return false
	}

	await db.delete('bookmarks', bookmarkId)
	dispatchDatabaseChangedEvent({
		storeName: 'bookmarks',
		operation: 'delete',
		key: bookmarkId,
		value: existing,
	})

	return true
}

export const deleteBookmarksForTrack = async (trackUuid: string): Promise<void> => {
	const db = await getDatabase()
	const tx = db.transaction('bookmarks', 'readwrite')
	const index = tx.store.index('trackUuid')
	const changes = []

	for await (const cursor of index.iterate(trackUuid)) {
		const value = cursor.value
		const key = cursor.primaryKey as number
		await cursor.delete()
		changes.push({
			storeName: 'bookmarks' as const,
			operation: 'delete' as const,
			key,
			value,
		})
	}

	await tx.done
	dispatchDatabaseChangedEvent(changes)
}
