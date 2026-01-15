/**
 * YAML catalog loader with validation
 */

import { load as yamlLoad } from 'js-yaml'
import { rajneeshLog } from '../feature-flags.ts'
import { CatalogValidationError, validateCatalog } from './schema.ts'
import type { RajneeshCatalog } from './types.ts'

/**
 * Parse and validate YAML content into a typed catalog
 * @throws CatalogValidationError if the YAML is invalid or doesn't match schema
 */
export const loadCatalog = (yamlContent: string): RajneeshCatalog => {
	let parsed: unknown

	try {
		parsed = yamlLoad(yamlContent)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		throw new CatalogValidationError(`Failed to parse YAML: ${message}`, 'catalog')
	}

	const catalog = validateCatalog(parsed)
	rajneeshLog(`Loaded catalog with ${catalog.series.length} series`)

	return catalog
}

/**
 * Load catalog from a raw YAML string imported via Vite
 * This is the primary entry point for loading the bundled catalog
 */
export const loadBundledCatalog = (rawYaml: string): RajneeshCatalog => {
	return loadCatalog(rawYaml)
}

/**
 * Fetch and load catalog from a URL
 */
export const loadCatalogFromUrl = async (url: string): Promise<RajneeshCatalog> => {
	const response = await fetch(url)

	if (!response.ok) {
		throw new CatalogValidationError(
			`Failed to fetch catalog: HTTP ${response.status}`,
			'catalog',
		)
	}

	const yamlContent = await response.text()
	return loadCatalog(yamlContent)
}
