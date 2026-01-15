/**
 * IndexedDB-based audio cache for persistent storage.
 * 
 * Audio is NEVER streamed directly from remote URLs.
 * All audio must be downloaded and stored in IndexedDB first,
 * then played from a blob URL created from the cached blob.
 */

import type { CacheEntry, CacheStats } from './types'

const DB_NAME = 'RajneeshAudioCache'
const DB_VERSION = 1
const STORE_NAME = 'audio'

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * Open the IndexedDB database
 */
const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) {
    return dbPromise
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('[AudioCache] Failed to open IndexedDB:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      console.log('[AudioCache] IndexedDB opened successfully')
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      console.log('[AudioCache] Creating IndexedDB schema')
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'url' })
        console.log('[AudioCache] Created object store:', STORE_NAME)
      }
    }
  })

  return dbPromise
}

/**
 * Check if a URL is cached
 */
export const isUrlCached = async (url: string): Promise<boolean> => {
  try {
    const db = await openDB()
    const tx = db.transaction([STORE_NAME], 'readonly')
    const store = tx.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.count(url)

      request.onsuccess = () => {
        resolve(request.result > 0)
      }

      request.onerror = () => {
        console.error('[AudioCache] Error checking cache:', request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('[AudioCache] Error accessing IndexedDB:', error)
    return false
  }
}

/**
 * Get a cached blob by URL
 */
export const getCachedBlob = async (url: string): Promise<Blob | null> => {
  try {
    const db = await openDB()
    const tx = db.transaction([STORE_NAME], 'readonly')
    const store = tx.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.get(url)

      request.onsuccess = () => {
        const result = request.result as CacheEntry | undefined
        if (result) {
          console.log(
            `[AudioCache] Cache hit for: ${url} (${result.size} bytes)`,
          )
          resolve(result.blob)
        } else {
          console.log(`[AudioCache] Cache miss for: ${url}`)
          resolve(null)
        }
      }

      request.onerror = () => {
        console.error('[AudioCache] Error reading from cache:', request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('[AudioCache] Error accessing IndexedDB:', error)
    return null
  }
}

/**
 * Store a blob in the cache
 */
export const storeBlob = async (
  url: string,
  blob: Blob,
  contentType: string = 'audio/mpeg',
): Promise<void> => {
  try {
    const db = await openDB()
    const tx = db.transaction([STORE_NAME], 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    const entry: CacheEntry = {
      url,
      blob,
      timestamp: Date.now(),
      size: blob.size,
      contentType,
    }

    return new Promise((resolve, reject) => {
      const request = store.put(entry)

      request.onsuccess = () => {
        console.log(
          `[AudioCache] Stored blob: ${url} (${blob.size} bytes)`,
        )
        resolve()
      }

      request.onerror = () => {
        console.error('[AudioCache] Error storing in cache:', request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('[AudioCache] Error storing in IndexedDB:', error)
    throw error
  }
}

/**
 * Remove a cached entry by URL
 */
export const removeCachedUrl = async (url: string): Promise<void> => {
  try {
    const db = await openDB()
    const tx = db.transaction([STORE_NAME], 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.delete(url)

      request.onsuccess = () => {
        console.log(`[AudioCache] Removed cached entry: ${url}`)
        resolve()
      }

      request.onerror = () => {
        console.error('[AudioCache] Error removing from cache:', request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('[AudioCache] Error removing from IndexedDB:', error)
    throw error
  }
}

/**
 * Clear all cached entries
 */
export const clearCache = async (): Promise<void> => {
  try {
    const db = await openDB()
    const tx = db.transaction([STORE_NAME], 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.clear()

      request.onsuccess = () => {
        console.log('[AudioCache] Cache cleared')
        resolve()
      }

      request.onerror = () => {
        console.error('[AudioCache] Error clearing cache:', request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('[AudioCache] Error clearing IndexedDB:', error)
    throw error
  }
}

/**
 * Get cache statistics
 */
export const getCacheStats = async (): Promise<CacheStats> => {
  try {
    const db = await openDB()
    const tx = db.transaction([STORE_NAME], 'readonly')
    const store = tx.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.getAll()

      request.onsuccess = () => {
        const entries = request.result as CacheEntry[]
        const stats: CacheStats = {
          count: entries.length,
          totalSize: entries.reduce((sum, entry) => sum + entry.size, 0),
        }
        resolve(stats)
      }

      request.onerror = () => {
        console.error('[AudioCache] Error getting stats:', request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('[AudioCache] Error getting cache stats:', error)
    return { count: 0, totalSize: 0 }
  }
}

/**
 * List all cached URLs (for debugging)
 */
export const listCachedUrls = async (): Promise<string[]> => {
  try {
    const db = await openDB()
    const tx = db.transaction([STORE_NAME], 'readonly')
    const store = tx.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.getAllKeys()

      request.onsuccess = () => {
        resolve(request.result as string[])
      }

      request.onerror = () => {
        console.error('[AudioCache] Error listing keys:', request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('[AudioCache] Error listing cached URLs:', error)
    return []
  }
}

// Export as a namespace object for convenience
export const audioCache = {
  isUrlCached,
  getCachedBlob,
  storeBlob,
  removeCachedUrl,
  clearCache,
  getCacheStats,
  listCachedUrls,
}
