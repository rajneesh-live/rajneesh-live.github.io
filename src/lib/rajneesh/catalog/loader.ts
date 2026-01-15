/**
 * YAML catalog loader with validation
 */

import { load as yamlLoad } from 'js-yaml'
import { validateCatalog, ValidationError } from './schema'
import type { RajneeshCatalog } from './types'

/**
 * Parse and validate YAML content into a typed catalog
 * @throws ValidationError if the YAML is invalid or doesn't match schema
 */
export const loadCatalog = (yamlContent: string): RajneeshCatalog => {
  let parsed: unknown

  try {
    parsed = yamlLoad(yamlContent)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new ValidationError(`Failed to parse YAML: ${message}`, 'catalog')
  }

  return validateCatalog(parsed)
}

/**
 * Load catalog from a raw YAML string imported via Vite
 * This is the primary entry point for loading the bundled catalog
 */
export const loadBundledCatalog = (rawYaml: string): RajneeshCatalog => {
  return loadCatalog(rawYaml)
}
