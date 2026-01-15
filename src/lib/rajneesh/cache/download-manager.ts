/**
 * Download manager with queue, concurrency control, and progress tracking.
 *
 * Downloads audio files completely before storing in IndexedDB.
 * Never streams directly from remote URLs.
 */

import { rajneeshLog } from '../feature-flags.ts'
import { isUrlCached, storeBlob } from './audio-cache.ts'
import type { DownloadProgress, DownloadState } from './types.ts'

const MAX_CONCURRENT = 2
const RETRY_ATTEMPTS = 2
const RETRY_DELAY_MS = 1000

type ProgressCallback = (progress: DownloadProgress) => void

interface QueueItem {
	trackId: string
	url: string
	retryCount: number
}

/**
 * Create a download manager instance
 */
export const createDownloadManager = () => {
	const queue: QueueItem[] = []
	const active = new Map<string, AbortController>()
	const progressMap = new Map<string, DownloadProgress>()
	const subscribers = new Set<ProgressCallback>()

	const notifySubscribers = (progress: DownloadProgress) => {
		progressMap.set(progress.trackId, progress)
		for (const callback of subscribers) {
			callback(progress)
		}
	}

	const updateProgress = (
		trackId: string,
		url: string,
		state: DownloadState,
		progress: number,
		bytesLoaded: number = 0,
		bytesTotal: number = 0,
		error?: string,
	) => {
		notifySubscribers({
			trackId,
			url,
			state,
			progress,
			bytesLoaded,
			bytesTotal,
			error,
		})
	}

	const processQueue = async () => {
		// Don't start more downloads if at max concurrency
		if (active.size >= MAX_CONCURRENT) {
			return
		}

		// Get next item from queue
		const item = queue.shift()
		if (!item) {
			return
		}

		const { trackId, url, retryCount } = item

		// Skip if already downloading
		if (active.has(trackId)) {
			return
		}

		// Check if already cached
		const cached = await isUrlCached(url)
		if (cached) {
			updateProgress(trackId, url, 'complete', 100, 0, 0)
			processQueue()
			return
		}

		// Start download
		const controller = new AbortController()
		active.set(trackId, controller)

		updateProgress(trackId, url, 'downloading', 0, 0, 0)

		try {
			const response = await fetch(url, { signal: controller.signal })

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`)
			}

			const contentLength = response.headers.get('content-length')
			const totalBytes = contentLength ? parseInt(contentLength, 10) : 0
			const contentType = response.headers.get('content-type') || 'audio/mpeg'

			// Read the response as a stream to track progress
			const reader = response.body?.getReader()
			if (!reader) {
				throw new Error('Failed to get response reader')
			}

			const chunks: Uint8Array[] = []
			let loadedBytes = 0

			while (true) {
				const { done, value } = await reader.read()

				if (done) {
					break
				}

				chunks.push(value)
				loadedBytes += value.length

				const progressPercent = totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : 0

				updateProgress(trackId, url, 'downloading', progressPercent, loadedBytes, totalBytes)
			}

			// Combine chunks into a blob
			const blob = new Blob(chunks, { type: contentType })

			// Store in cache
			await storeBlob(url, blob, contentType)

			updateProgress(trackId, url, 'complete', 100, blob.size, blob.size)
			rajneeshLog(`Download complete: ${trackId}`)
		} catch (error) {
			if (controller.signal.aborted) {
				rajneeshLog(`Download cancelled: ${trackId}`)
				updateProgress(trackId, url, 'idle', 0, 0, 0)
			} else {
				const errorMessage = error instanceof Error ? error.message : String(error)
				rajneeshLog(`Download error for ${trackId}:`, errorMessage)

				// Retry logic
				if (retryCount < RETRY_ATTEMPTS) {
					rajneeshLog(`Retrying download (${retryCount + 1}/${RETRY_ATTEMPTS}): ${trackId}`)
					setTimeout(() => {
						queue.push({ trackId, url, retryCount: retryCount + 1 })
						processQueue()
					}, RETRY_DELAY_MS)
				} else {
					updateProgress(trackId, url, 'error', 0, 0, 0, errorMessage)
				}
			}
		} finally {
			active.delete(trackId)
			// Process next item in queue
			processQueue()
		}
	}

	return {
		/**
		 * Add a track to the download queue
		 */
		enqueue(trackId: string, url: string): void {
			// Check if already in queue or downloading
			if (
				queue.some((item) => item.trackId === trackId) ||
				active.has(trackId)
			) {
				rajneeshLog(`Track already queued or downloading: ${trackId}`)
				return
			}

			queue.push({ trackId, url, retryCount: 0 })
			updateProgress(trackId, url, 'queued', 0, 0, 0)
			processQueue()
		},

		/**
		 * Cancel a download
		 */
		cancel(trackId: string): void {
			// Cancel active download
			const controller = active.get(trackId)
			if (controller) {
				controller.abort()
				active.delete(trackId)
			}

			// Remove from queue
			const queueIndex = queue.findIndex((item) => item.trackId === trackId)
			if (queueIndex !== -1) {
				queue.splice(queueIndex, 1)
			}

			const progress = progressMap.get(trackId)
			if (progress) {
				updateProgress(trackId, progress.url, 'idle', 0, 0, 0)
			}
		},

		/**
		 * Cancel all downloads
		 */
		cancelAll(): void {
			for (const [trackId, controller] of active) {
				controller.abort()
				const progress = progressMap.get(trackId)
				if (progress) {
					updateProgress(trackId, progress.url, 'idle', 0, 0, 0)
				}
			}
			active.clear()
			queue.length = 0
		},

		/**
		 * Get progress for a specific track
		 */
		getProgress(trackId: string): DownloadProgress | undefined {
			return progressMap.get(trackId)
		},

		/**
		 * Get all current progress states
		 */
		getAllProgress(): Map<string, DownloadProgress> {
			return new Map(progressMap)
		},

		/**
		 * Subscribe to progress updates
		 */
		subscribe(callback: ProgressCallback): () => void {
			subscribers.add(callback)
			return () => {
				subscribers.delete(callback)
			}
		},

		/**
		 * Check if a track is currently downloading or queued
		 */
		isDownloading(trackId: string): boolean {
			return active.has(trackId) || queue.some((item) => item.trackId === trackId)
		},

		/**
		 * Get current queue length
		 */
		get queueLength(): number {
			return queue.length
		},

		/**
		 * Get number of active downloads
		 */
		get activeCount(): number {
			return active.size
		},
	}
}

// Singleton instance
let downloadManagerInstance: ReturnType<typeof createDownloadManager> | null = null

/**
 * Get the singleton download manager instance
 */
export const getDownloadManager = () => {
	if (!downloadManagerInstance) {
		downloadManagerInstance = createDownloadManager()
	}
	return downloadManagerInstance
}
