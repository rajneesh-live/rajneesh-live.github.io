/**
 * Svelte 5 runes-based store for download progress.
 * Provides reactive access to download states.
 */

import { getDownloadManager } from '../cache/download-manager.ts'
import type { DownloadProgress } from '../cache/types.ts'

// Reactive state container - use an object so we can mutate properties
const downloadStore = $state<{ progress: Map<string, DownloadProgress> }>({
	progress: new Map(),
})

// Initialize subscription to download manager
let initialized = false

export const initializeDownloadStore = () => {
	if (initialized) return

	const manager = getDownloadManager()

	// Subscribe to progress updates
	manager.subscribe((progress) => {
		console.log(`[Rajneesh] Download progress update:`, progress.trackId, progress.state, progress.progress)
		// Create a new Map to trigger reactivity
		const newMap = new Map(downloadStore.progress)
		newMap.set(progress.trackId, progress)
		downloadStore.progress = newMap
	})

	initialized = true
}

/**
 * Get the reactive download progress map
 */
export const getDownloadProgressState = () => downloadStore.progress

/**
 * Get download progress for a specific track
 */
export const getTrackProgress = (trackId: string): DownloadProgress | undefined => {
	initializeDownloadStore()
	return downloadStore.progress.get(trackId)
}

/**
 * Check if a track is downloaded (complete state)
 */
export const isTrackDownloaded = (trackId: string): boolean => {
	const progress = getTrackProgress(trackId)
	return progress?.state === 'complete'
}

/**
 * Check if a track is currently downloading
 */
export const isTrackDownloading = (trackId: string): boolean => {
	const progress = getTrackProgress(trackId)
	return progress?.state === 'downloading' || progress?.state === 'queued'
}

/**
 * Get download progress percentage for a track
 */
export const getTrackProgressPercent = (trackId: string): number => {
	const progress = getTrackProgress(trackId)
	return progress?.progress ?? 0
}

/**
 * Start downloading a track
 */
export const downloadTrack = (trackId: string, url: string): void => {
	initializeDownloadStore()
	console.log(`[Rajneesh] Starting download:`, trackId, url)
	const manager = getDownloadManager()
	manager.enqueue(trackId, url)
}

/**
 * Cancel a track download
 */
export const cancelDownload = (trackId: string): void => {
	initializeDownloadStore()
	const manager = getDownloadManager()
	manager.cancel(trackId)
}

/**
 * Get all download progress as a reactive Map
 */
export const getAllDownloadProgress = () => {
	initializeDownloadStore()
	return downloadStore.progress
}
