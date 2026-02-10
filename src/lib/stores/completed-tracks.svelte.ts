import { onDatabaseChange } from '$lib/db/events.ts'
import {
	addCompletedTrack,
	getCompletedTrackIds,
	removeCompletedTrack,
} from '$lib/db/completed-tracks.ts'

let completedTracks = $state<string[]>([])
let loaded = $state(false)
let loading = $state(false)

const refreshCompletedTracks = async () => {
	if (loading) {
		return
	}
	loading = true
	completedTracks = await getCompletedTrackIds()
	loaded = true
	loading = false
}

export const ensureCompletedTracksLoaded = async (): Promise<void> => {
	if (loaded || loading) {
		return
	}
	await refreshCompletedTracks()
}

export const isTrackCompleted = (trackId: string): boolean => completedTracks.includes(trackId)

export const markTrackCompleted = async (trackId: string): Promise<void> => {
	await addCompletedTrack(trackId)
	if (!completedTracks.includes(trackId)) {
		completedTracks = [...completedTracks, trackId]
	}
}

export const unmarkTrackCompleted = async (trackId: string): Promise<void> => {
	await removeCompletedTrack(trackId)
	if (completedTracks.includes(trackId)) {
		completedTracks = completedTracks.filter((id) => id !== trackId)
	}
}

if (!import.meta.env.SSR) {
	onDatabaseChange((changes) => {
		if (!loaded) {
			return
		}

		for (const change of changes) {
			if (change.storeName === 'completedTracks') {
				void refreshCompletedTracks()
				return
			}
		}
	})
}
