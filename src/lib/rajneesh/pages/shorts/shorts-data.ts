import { getCatalog } from '$lib/rajneesh/stores/catalog.svelte.ts'
import { getPersistedHindiOnly } from '$lib/stores/main/store.svelte.ts'
import type { RemoteFile } from '$lib/rajneesh/types.ts'
import type { Track } from '$lib/library/types.ts'

export interface ShortItem {
	url: string
	startSeconds: number
	albumName: string
	albumUuid: string
	trackIndex: number // 1-based
}

const PAGE_SIZE = 20
const MIN_START = 60 // 1 min
const MAX_START = 40 * 60 // 40 min

const isEnglishTrack = (url: string): boolean =>
	url.toLowerCase().includes('/english/')

function getFilteredTracks(): Track[] {
	const catalog = getCatalog()
	if (!catalog || catalog.tracks.length === 0) return []

	const hindiOnly = getPersistedHindiOnly()
	if (!hindiOnly) return catalog.tracks

	return catalog.tracks.filter((t) => {
		const file = t.file as RemoteFile | undefined
		return file?.url && !isEnglishTrack(file.url)
	})
}

// Module-level growable list — survives component remounts
const items: ShortItem[] = []
let generatedWithHindiOnly: boolean | null = null

function generateBatch(count: number): ShortItem[] {
	const tracks = getFilteredTracks()
	if (tracks.length === 0) return []

	const batch: ShortItem[] = []

	let attempts = 0
	while (batch.length < count && attempts < count * 3) {
		attempts++
		const idx = Math.floor(Math.random() * tracks.length)
		const track = tracks[idx]
		const file = track.file as RemoteFile | undefined
		if (!file || file.type !== 'remote' || !file.url) continue

		const startSeconds = Math.floor(Math.random() * (MAX_START - MIN_START + 1)) + MIN_START

		// Find album info for this track
		const catalog = getCatalog()
		const album = catalog?.albums.find((a) => a.name === track.album)

		batch.push({
			url: file.url,
			startSeconds,
			albumName: track.album ?? 'Unknown',
			albumUuid: album?.uuid ?? '',
			trackIndex: track.trackNo,
		})
	}

	return batch
}

/** Get all currently loaded shorts */
export function getShortsItems(): ShortItem[] {
	const currentHindiOnly = getPersistedHindiOnly()
	// Reset if the language filter changed since last generation
	if (generatedWithHindiOnly !== null && generatedWithHindiOnly !== currentHindiOnly) {
		items.length = 0
	}
	// Seed initial batch if empty
	if (items.length === 0) {
		generatedWithHindiOnly = currentHindiOnly
		items.push(...generateBatch(PAGE_SIZE))
	}
	return items
}

/** Append another page of random shorts. Returns the new total count. */
export function loadMoreShorts(): number {
	items.push(...generateBatch(PAGE_SIZE))
	return items.length
}

/** Reset everything (full page reload or setting change) */
export function resetShortsData(): void {
	items.length = 0
	generatedWithHindiOnly = null
}
