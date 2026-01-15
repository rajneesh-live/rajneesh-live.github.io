/**
 * Types for the audio cache and download system.
 */

/**
 * A cached audio entry in IndexedDB
 */
export interface CacheEntry {
	url: string
	blob: Blob
	timestamp: number
	size: number
	contentType: string
}

/**
 * Cache statistics
 */
export interface CacheStats {
	count: number
	totalSize: number
}

/**
 * Download state for a track
 */
export type DownloadState = 'idle' | 'queued' | 'downloading' | 'complete' | 'error'

/**
 * Progress information for a download
 */
export interface DownloadProgress {
	trackId: string
	url: string
	state: DownloadState
	progress: number
	bytesLoaded: number
	bytesTotal: number
	error?: string
}
