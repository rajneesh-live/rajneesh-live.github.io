import type { CompletedTrack } from './database.ts'
import { getDatabase } from './database.ts'
import { dispatchDatabaseChangedEvent } from './events.ts'

export const addCompletedTrack = async (
	trackId: string,
	completedAt = Date.now(),
): Promise<CompletedTrack> => {
	const db = await getDatabase()
	const tx = db.transaction('completedTracks', 'readwrite')
	const index = tx.store.index('trackId')
	const existing = await index.get(trackId)
	const value: CompletedTrack = {
		...(existing ?? {}),
		trackId,
		completedAt,
	}
	const key = (await tx.store.put(value)) as number
	await tx.done

	dispatchDatabaseChangedEvent({
		operation: existing ? 'update' : 'add',
		storeName: 'completedTracks',
		key,
	})

	return value
}

export const removeCompletedTrack = async (trackId: string): Promise<void> => {
	const db = await getDatabase()
	const tx = db.transaction('completedTracks', 'readwrite')
	const index = tx.store.index('trackId')
	const key = await index.getKey(trackId)
	if (key !== undefined) {
		await tx.store.delete(key as number)
		dispatchDatabaseChangedEvent({
			operation: 'delete',
			storeName: 'completedTracks',
			key: key as number,
		})
	}
	await tx.done
}

export const getCompletedTrackIds = async (): Promise<string[]> => {
	const db = await getDatabase()
	const records = await db.getAll('completedTracks')
	return records.map((record) => record.trackId)
}
