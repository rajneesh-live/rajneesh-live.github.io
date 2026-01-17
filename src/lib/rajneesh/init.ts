/**
 * Rajneesh module initialization
 * Call this during app startup to load the catalog
 */

import { rajneeshLog, isRajneeshEnabled } from './feature-flags.ts'
import { initializeCatalog } from './stores/catalog.svelte.ts'

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
		// Fetch the catalog JSON
		rajneeshLog('Fetching catalog from /catalog.json...')
		const response = await fetch('/rajneesh/catalog.json')

		if (!response.ok) {
			throw new Error(
				`Failed to fetch catalog: ${response.status} ${response.statusText}`,
			)
		}

		const json = await response.json()

		// Initialize the catalog
		await initializeCatalog(json)
		initialized = true
		rajneeshLog('Rajneesh initialization complete')
	} catch (error) {
		rajneeshLog('Rajneesh initialization failed:', error)
		// We don't throw here to avoid crashing the whole app init, 
		// but the catalog won't be available.
		console.error(error)
	}
}

/**
 * Check if Rajneesh has been initialized
 */
export const isRajneeshInitialized = (): boolean => initialized
