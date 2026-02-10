/**
 * Svelte 5 runes-based store for the Rajneesh catalog.
 * Loads and provides access to the normalized catalog data.
 *
 * NOTE: This store keeps all data IN MEMORY. It does NOT write to IndexedDB.
 */

import { isRajneeshEnabled, rajneeshLog } from '../feature-flags.ts'
import { type NormalizedCatalog, parseCatalogJson } from '../catalog/parser-json.ts'
import type { CompactCatalogV1 } from '../catalog/schema-json.ts'

// Reactive state using Svelte 5 runes
let catalogState = $state<NormalizedCatalog | null>(null)
let loadingState = $state(false)
let errorState = $state<string | null>(null)
let initializedState = $state(false)
let readyState = $state(false)

let catalogReadyResolve: (() => void) | null = null
const catalogReadyPromise = new Promise<void>((resolve) => {
	catalogReadyResolve = resolve
})

/**
 * Initialize the catalog store with JSON content
 */
export const initializeCatalog = async (
	json: CompactCatalogV1,
): Promise<void> => {
	if (!isRajneeshEnabled()) {
		rajneeshLog('Rajneesh features disabled, skipping catalog initialization')
		return
	}

	if (initializedState) {
		rajneeshLog('Catalog already initialized, updating...')
	}

	loadingState = true
	errorState = null

	try {
		// Just parse into memory, no DB writes
		const normalized = parseCatalogJson(json)
		catalogState = normalized
		initializedState = true
		rajneeshLog('Catalog initialized in memory successfully')

	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		errorState = message
		rajneeshLog('Failed to initialize catalog:', message)
	} finally {
		loadingState = false
		readyState = true
		if (catalogReadyResolve) {
			catalogReadyResolve()
			catalogReadyResolve = null
		}
	}
}

/**
 * Get the current catalog state
 */
export const getCatalog = () => catalogState

/**
 * Check if the catalog is loading
 */
export const isCatalogLoading = () => loadingState

/**
 * Get any catalog loading error
 */
export const getCatalogError = () => errorState

/**
 * Check if the catalog has been initialized
 */
export const isCatalogInitialized = () => initializedState

/**
 * Check if the catalog finished initialization attempt
 */
export const isCatalogReady = () => readyState

/**
 * Await catalog initialization attempt (success or failure)
 */
export const whenCatalogReady = (): Promise<void> =>
	readyState ? Promise.resolve() : catalogReadyPromise
