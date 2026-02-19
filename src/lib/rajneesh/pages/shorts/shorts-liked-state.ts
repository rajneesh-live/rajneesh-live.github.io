import type { DBSchema } from 'idb'
import { openDB } from 'idb'

const DB_NAME = 'rajneesh-shorts-state'
const DB_VERSION = 1
const LIKED_TRACKS_STORE = 'likedTracks'

interface ShortsStateDB extends DBSchema {
	likedTracks: {
		key: string
		value: {
			trackId: string
			likedAt: number
		}
	}
}

const getDb = () =>
	openDB<ShortsStateDB>(DB_NAME, DB_VERSION, {
		upgrade(db) {
			if (!db.objectStoreNames.contains(LIKED_TRACKS_STORE)) {
				db.createObjectStore(LIKED_TRACKS_STORE, { keyPath: 'trackId' })
			}
		},
	})

export async function getLikedTrackIds(): Promise<string[]> {
	const db = await getDb()
	return await db.getAllKeys(LIKED_TRACKS_STORE)
}

export async function setTrackLiked(trackId: string, liked: boolean): Promise<void> {
	const db = await getDb()
	if (liked) {
		await db.put(LIKED_TRACKS_STORE, {
			trackId,
			likedAt: Date.now(),
		})
		return
	}

	await db.delete(LIKED_TRACKS_STORE, trackId)
}
