import { getCatalog } from '../stores/catalog.svelte.ts'
import type { SortOptions } from '$lib/library/get/ids.ts'
import type { LibraryStoreName } from '$lib/library/types.ts'
import { getLibraryItemIds } from '$lib/library/get/ids.ts'

/**
 * Hook for getLibraryItemIds
 * Queries the in-memory Rajneesh catalog instead of IndexedDB
 */
export const rajneeshGetLibraryItemIds = async <Store extends LibraryStoreName>(
	store: Store,
	options: SortOptions<Store>,
): Promise<number[]> => {
	const catalog = getCatalog()
	
	if (!catalog) {
		// Fallback or handling for explore which reuses albums logic but might want to use native DB if catalog is empty/not used in this context
		// Note: The original implementation was synchronous returning number[], but the interface expects Promise<number[]>
		// The original code in ids.ts awaits this if isRajneeshEnabled() is true.
		
		if (store === 'explore') {
			// Reuse albums logic for explore
			return getLibraryItemIds('albums', options as any)
		}
		
		return []
	}

	let items: any[] = []

	if (store === 'tracks') {
		items = catalog.tracks
	} else if (store === 'albums' || store === 'explore') {
		items = catalog.albums
	} else if (store === 'artists') {
		items = [catalog.artist]
	} else {
		return []
	}

	// Create a shallow copy so we don't mutate the store with sort()
	items = [...items]

	// Filter
	if (options.searchTerm && options.searchFn) {
		const { searchTerm, searchFn } = options
		items = items.filter((item) => searchFn(item, searchTerm))
	}

	// Sort
	const { sort, order } = options
	if (sort) {
		items.sort((a, b) => {
			const valA = a[sort]
			const valB = b[sort]

			// Handle string comparison safely
			if (typeof valA === 'string' && typeof valB === 'string') {
				return valA.localeCompare(valB)
			}
			
			if (valA < valB) return -1
			if (valA > valB) return 1
			return 0
		})
	}

	if (order === 'desc') {
		items.reverse()
	}

	return items.map((item) => item.id)
}

/**
 * Hook for dbGetAlbumTracksIdsByName
 */
export const rajneeshGetAlbumTracksIdsByName = (albumName: string): number[] => {
	const catalog = getCatalog()
	if (!catalog) return []

	return catalog.tracks
		.filter((t) => t.album === albumName)
		.sort((a, b) => {
			if (a.discNo !== b.discNo) return a.discNo - b.discNo
			return a.trackNo - b.trackNo
		})
		.map((t) => t.id)
}

/**
 * Hook for dbGetArtistTracksIdsByName
 */
export const rajneeshGetArtistTracksIdsByName = (artistName: string): number[] => {
	const catalog = getCatalog()
	if (!catalog) return []

	return catalog.tracks.map((t) => t.id)
}

/**
 * Hook for getTracksCount
 */
export const rajneeshGetTracksCount = (): number => {
	const catalog = getCatalog()
	if (!catalog) return 0
	return catalog.tracks.length
}

/**
 * Hook for getKeyFromIndex (UUID lookup)
 */
export const rajneeshGetIdFromUuid = (
	storeName: LibraryStoreName,
	uuid: string,
): number | undefined => {
	const catalog = getCatalog()
	if (!catalog) return undefined

	if (storeName === 'tracks') {
		return catalog.tracks.find((t) => t.uuid === uuid)?.id
	}
	if (storeName === 'albums' || storeName === 'explore') {
		return catalog.albums.find((a) => a.uuid === uuid)?.id
	}
	if (storeName === 'artists') {
		return catalog.artist.uuid === uuid ? catalog.artist.id : undefined
	}
	return undefined
}
