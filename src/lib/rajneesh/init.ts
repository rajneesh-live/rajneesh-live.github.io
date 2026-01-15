/**
 * Rajneesh module initialization
 * Call this during app startup to load the catalog
 */

import { rajneeshLog, isRajneeshEnabled } from './feature-flags.ts'
import { initializeCatalog } from './stores/catalog.svelte.ts'

// Import the catalog YAML as raw text
// This will be bundled into the app
import catalogYaml from './data/rajneesh-catalog.yaml?raw'

let initialized = false

/**
 * Initialize all Rajneesh features.
 * Should be called once during app startup.
 */
export const initializeRajneesh = async (): Promise<void> => {
	if (initialized) {
		rajneeshLog('Rajneesh already initialized')
		return
	}

	if (!isRajneeshEnabled()) {
		rajneeshLog('Rajneesh features disabled')
		return
	}

	rajneeshLog('Initializing Rajneesh features...')

	try {
		// Initialize the catalog
		await initializeCatalog(catalogYaml)
		initialized = true
		rajneeshLog('Rajneesh initialization complete')
	} catch (error) {
		rajneeshLog('Rajneesh initialization failed:', error)
		throw error
	}
}

/**
 * Check if Rajneesh has been initialized
 */
export const isRajneeshInitialized = (): boolean => initialized
