/**
 * Cache module - IndexedDB audio caching
 */

export type {
  CacheEntry,
  CacheStats,
  DownloadState,
  DownloadProgress,
} from './types'

export {
  audioCache,
  isUrlCached,
  getCachedBlob,
  storeBlob,
  removeCachedUrl,
  clearCache,
  getCacheStats,
  listCachedUrls,
} from './audio-cache'
