/**
 * Types for the audio cache module
 */

/**
 * Entry stored in IndexedDB for cached audio
 */
export interface CacheEntry {
  /** The original URL (used as key) */
  url: string
  /** The audio blob data */
  blob: Blob
  /** Timestamp when the entry was cached */
  timestamp: number
  /** Size of the blob in bytes */
  size: number
  /** Content type from the response */
  contentType: string
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Number of cached entries */
  count: number
  /** Total size of all cached entries in bytes */
  totalSize: number
}

/**
 * Download progress state
 */
export type DownloadState = 'pending' | 'downloading' | 'complete' | 'error'

/**
 * Progress information for a download
 */
export interface DownloadProgress {
  /** Track ID being downloaded */
  trackId: string
  /** URL being downloaded */
  url: string
  /** Current state */
  state: DownloadState
  /** Progress percentage (0-100) */
  progress: number
  /** Bytes downloaded so far */
  bytesLoaded: number
  /** Total bytes (if known) */
  bytesTotal: number
  /** Error message if state is 'error' */
  error?: string
}
