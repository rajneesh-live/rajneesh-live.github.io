/**
 * Download manager with queue, concurrency control, and progress tracking.
 * 
 * Downloads audio files completely before storing in IndexedDB.
 * Never streams directly from remote URLs.
 */

import { storeBlob, isUrlCached } from './audio-cache'
import type { DownloadProgress, DownloadState } from './types'

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
    subscribers.forEach((callback) => callback(progress))
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
      const contentType =
        response.headers.get('content-type') || 'audio/mpeg'

      // Read the response as an array buffer to track progress
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Response body is not readable')
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

        const progress = totalBytes > 0
          ? Math.round((loadedBytes / totalBytes) * 100)
          : 0

        updateProgress(
          trackId,
          url,
          'downloading',
          progress,
          loadedBytes,
          totalBytes,
        )
      }

      // Combine chunks into a single blob
      const blob = new Blob(chunks, { type: contentType })

      if (blob.size === 0) {
        throw new Error('Downloaded file is empty')
      }

      // Store in IndexedDB
      await storeBlob(url, blob, contentType)

      console.log(
        `[DownloadManager] Downloaded: ${trackId} (${blob.size} bytes)`,
      )

      updateProgress(trackId, url, 'complete', 100, blob.size, blob.size)
    } catch (error) {
      if (controller.signal.aborted) {
        console.log(`[DownloadManager] Download cancelled: ${trackId}`)
        updateProgress(trackId, url, 'error', 0, 0, 0, 'Cancelled')
      } else {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`[DownloadManager] Download failed: ${trackId}`, error)

        // Retry if attempts remaining
        if (retryCount < RETRY_ATTEMPTS) {
          console.log(
            `[DownloadManager] Retrying ${trackId} (attempt ${retryCount + 2}/${RETRY_ATTEMPTS + 1})`,
          )
          setTimeout(() => {
            queue.push({ trackId, url, retryCount: retryCount + 1 })
            processQueue()
          }, RETRY_DELAY_MS)
        } else {
          updateProgress(trackId, url, 'error', 0, 0, 0, message)
        }
      }
    } finally {
      active.delete(trackId)
      processQueue()
    }
  }

  /**
   * Add a track to the download queue
   */
  const download = (trackId: string, url: string): void => {
    // Skip if already queued or active
    if (
      active.has(trackId) ||
      queue.some((item) => item.trackId === trackId)
    ) {
      console.log(`[DownloadManager] Already queued/active: ${trackId}`)
      return
    }

    console.log(`[DownloadManager] Queuing download: ${trackId}`)
    queue.push({ trackId, url, retryCount: 0 })
    updateProgress(trackId, url, 'pending', 0, 0, 0)
    processQueue()
  }

  /**
   * Cancel a download
   */
  const cancel = (trackId: string): void => {
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

    progressMap.delete(trackId)
  }

  /**
   * Get the current progress for a track
   */
  const getProgress = (trackId: string): DownloadProgress | undefined => {
    return progressMap.get(trackId)
  }

  /**
   * Check if a track is currently downloading
   */
  const isDownloading = (trackId: string): boolean => {
    return active.has(trackId)
  }

  /**
   * Check if a track is in the queue
   */
  const isQueued = (trackId: string): boolean => {
    return queue.some((item) => item.trackId === trackId)
  }

  /**
   * Subscribe to progress updates
   */
  const subscribeToProgress = (callback: ProgressCallback): (() => void) => {
    subscribers.add(callback)
    return () => {
      subscribers.delete(callback)
    }
  }

  /**
   * Cancel all downloads and clear the queue
   */
  const cancelAll = (): void => {
    // Cancel all active downloads
    active.forEach((controller) => controller.abort())
    active.clear()

    // Clear queue
    queue.length = 0

    // Clear progress
    progressMap.clear()
  }

  return {
    download,
    cancel,
    cancelAll,
    getProgress,
    isDownloading,
    isQueued,
    subscribeToProgress,
  }
}

// Export a singleton instance for convenience
export const downloadManager = createDownloadManager()
