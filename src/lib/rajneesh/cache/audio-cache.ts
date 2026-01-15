/**
 * IndexedDB-based audio cache for persistent storage.
 *
 * Audio is NEVER streamed directly from remote URLs.
 * All audio must be downloaded and stored in IndexedDB first,
 * then played from a blob URL created from the cached blob.
 *
 * Uses the `idb` library for consistency with the main app database.
 */

import type { DBSchema } from 'idb'
import { openDB } from 'idb'
import { rajneeshLog } from '../feature-flags.ts'
import type { CacheEntry, CacheStats } from './types.ts'

const DB_NAME = 'RajneeshAudioCache'
const DB_VERSION = 1
const STORE_NAME = 'audio'

interface AudioCacheDB extends DBSchema {
	audio: {
		key: string
		value: CacheEntry
	}
}

let dbPromise: ReturnType<typeof openDB<AudioCacheDB>> | null = null

/**
 * Open the audio cache database
 */
const getDB = () => {
	if (!dbPromise) {
		dbPromise = openDB<AudioCacheDB>(DB_NAME, DB_VERSION, {
			upgrade(db) {
				if (!db.objectStoreNames.contains(STORE_NAME)) {
					db.createObjectStore(STORE_NAME, { keyPath: 'url' })
					rajneeshLog('Created audio cache store')
				}
			},
		})
	}
	return dbPromise
}

/**
 * Check if a URL is cached
 */
export const isUrlCached = async (url: string): Promise<boolean> => {
	try {
		const db = await getDB()
		const count = await db.count(STORE_NAME, url)
		return count > 0
	} catch (error) {
		rajneeshLog('Error checking cache:', error)
		return false
	}
}

/**
 * Get a cached blob by URL
 */
export const getCachedBlob = async (url: string): Promise<Blob | null> => {
	try {
		const db = await getDB()
		const entry = await db.get(STORE_NAME, url)

		if (entry) {
			rajneeshLog(`Cache hit for: ${url} (${entry.size} bytes)`)
			return entry.blob
		}

		rajneeshLog(`Cache miss for: ${url}`)
		return null
	} catch (error) {
		rajneeshLog('Error reading from cache:', error)
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
		const db = await getDB()

		const entry: CacheEntry = {
			url,
			blob,
			timestamp: Date.now(),
			size: blob.size,
			contentType,
		}

		await db.put(STORE_NAME, entry)
		rajneeshLog(`Stored blob: ${url} (${blob.size} bytes)`)
	} catch (error) {
		rajneeshLog('Error storing in cache:', error)
		throw error
	}
}

/**
 * Remove a cached entry by URL
 */
export const removeCachedUrl = async (url: string): Promise<void> => {
	try {
		const db = await getDB()
		await db.delete(STORE_NAME, url)
		rajneeshLog(`Removed cached entry: ${url}`)
	} catch (error) {
		rajneeshLog('Error removing from cache:', error)
		throw error
	}
}

/**
 * Clear all cached entries
 */
export const clearCache = async (): Promise<void> => {
	try {
		const db = await getDB()
		await db.clear(STORE_NAME)
		rajneeshLog('Cache cleared')
	} catch (error) {
		rajneeshLog('Error clearing cache:', error)
		throw error
	}
}

/**
 * Get cache statistics
 */
export const getCacheStats = async (): Promise<CacheStats> => {
	try {
		const db = await getDB()
		const entries = await db.getAll(STORE_NAME)

		return {
			count: entries.length,
			totalSize: entries.reduce((sum, entry) => sum + entry.size, 0),
		}
	} catch (error) {
		rajneeshLog('Error getting cache stats:', error)
		return { count: 0, totalSize: 0 }
	}
}

/**
 * List all cached URLs (for debugging)
 */
export const listCachedUrls = async (): Promise<string[]> => {
	try {
		const db = await getDB()
		return db.getAllKeys(STORE_NAME)
	} catch (error) {
		rajneeshLog('Error listing cached URLs:', error)
		return []
	}
}

/**
 * Audio cache API namespace
 */
export const audioCache = {
	isUrlCached,
	getCachedBlob,
	storeBlob,
	removeCachedUrl,
	clearCache,
	getCacheStats,
	listCachedUrls,
}
