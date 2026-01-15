/**
 * Rajneesh module - fork-specific functionality
 *
 * This module contains all Rajneesh-specific code isolated from upstream.
 * Features are controlled via feature flags to maintain upstream compatibility.
 */

export { RAJNEESH_FLAGS } from './feature-flags'
export type { RajneeshFlags } from './feature-flags'

// Catalog exports
export {
  loadCatalog,
  loadBundledCatalog,
  normalizeToEntities,
  validateCatalog,
  ValidationError,
} from './catalog'

export type {
  RajneeshCatalog,
  RajneeshSeries,
  RajneeshTrack,
  NormalizedEntities,
} from './catalog'

// Cache exports
export {
  audioCache,
  isUrlCached,
  getCachedBlob,
  storeBlob,
  clearCache,
  getCacheStats,
} from './cache'

export type {
  CacheEntry,
  CacheStats,
  DownloadState,
  DownloadProgress,
} from './cache'
