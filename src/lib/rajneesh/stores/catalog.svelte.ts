/**
 * Svelte 5 runes-based store for the Rajneesh catalog.
 * Loads and provides access to the normalized catalog data.
 */

import { getDatabase } from '$lib/db/database.ts'
import { isRajneeshEnabled, rajneeshLog } from '../feature-flags.ts'
import { loadCatalog, normalizeCatalog, type NormalizedCatalog } from '../catalog/index.ts'
import { CATALOG_DIRECTORY_ID } from '../catalog/normalizer.ts'

// Reactive state using Svelte 5 runes
let catalogState = $state<NormalizedCatalog | null>(null)
let loadingState = $state(false)
let errorState = $state<string | null>(null)
let initializedState = $state(false)

/**
 * Load the catalog from YAML and insert tracks into the database
 */
const loadAndInsertCatalog = async (yamlContent: string): Promise<NormalizedCatalog> => {
	const catalog = loadCatalog(yamlContent)
	const normalized = normalizeCatalog(catalog)

	// Insert tracks into the database
	const db = await getDatabase()
	const tx = db.transaction(['tracks', 'albums', 'artists'], 'readwrite')

	// Insert artist
	const artistsStore = tx.objectStore('artists')
	try {
		await artistsStore.add({
			id: normalized.artist.id,
			uuid: normalized.artist.uuid,
			name: normalized.artist.name,
		})
	} catch {
		// Artist may already exist, ignore
	}

	// Insert albums
	const albumsStore = tx.objectStore('albums')
	for (const album of normalized.albums) {
		try {
			await albumsStore.add(album)
		} catch {
			// Album may already exist, ignore
		}
	}

	// Insert tracks
	const tracksStore = tx.objectStore('tracks')
	for (const track of normalized.tracks) {
		try {
			await tracksStore.add(track)
		} catch {
			// Track may already exist, ignore
		}
	}

	await tx.done
	rajneeshLog(`Inserted ${normalized.tracks.length} tracks into database`)

	return normalized
}

/**
 * Check if catalog tracks are already in the database
 */
const isCatalogLoaded = async (): Promise<boolean> => {
	try {
		const db = await getDatabase()
		const count = await db.countFromIndex('tracks', 'directory', CATALOG_DIRECTORY_ID)
		return count > 0
	} catch {
		return false
	}
}

/**
 * Initialize the catalog store with YAML content
 */
export const initializeCatalog = async (yamlContent: string): Promise<void> => {
	if (!isRajneeshEnabled()) {
		rajneeshLog('Rajneesh features disabled, skipping catalog initialization')
		return
	}

	if (initializedState) {
		rajneeshLog('Catalog already initialized')
		return
	}

	// Check if catalog is already in the database
	const alreadyLoaded = await isCatalogLoaded()
	if (alreadyLoaded) {
		rajneeshLog('Catalog already in database, skipping load')
		initializedState = true
		return
	}

	loadingState = true
	errorState = null

	try {
		const normalized = await loadAndInsertCatalog(yamlContent)
		catalogState = normalized
		initializedState = true
		rajneeshLog('Catalog initialized successfully')
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		errorState = message
		rajneeshLog('Failed to initialize catalog:', message)
	} finally {
		loadingState = false
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
 * Clear catalog data from the database (useful for testing/reset)
 */
export const clearCatalogData = async (): Promise<void> => {
	const db = await getDatabase()
	const tx = db.transaction(['tracks', 'albums'], 'readwrite')

	// Delete tracks with catalog directory ID
	const tracksStore = tx.objectStore('tracks')
	const trackIndex = tracksStore.index('directory')
	let cursor = await trackIndex.openCursor(CATALOG_DIRECTORY_ID)

	while (cursor) {
		await cursor.delete()
		cursor = await cursor.continue()
	}

	await tx.done
	catalogState = null
	initializedState = false
	rajneeshLog('Catalog data cleared')
}
