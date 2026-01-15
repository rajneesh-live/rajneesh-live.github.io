/**
 * Catalog module - YAML catalog loading and validation
 */

export type {
  RajneeshCatalog,
  RajneeshSeries,
  RajneeshTrack,
  RajneeshCatalogMetadata,
} from './types'

export {
  validateCatalog,
  validateSeries,
  validateTrack,
  validateMetadata,
  ValidationError,
} from './schema'

export { loadCatalog, loadBundledCatalog } from './loader'

export { normalizeToEntities } from './normalizer'
export type { NormalizedEntities } from './normalizer'
