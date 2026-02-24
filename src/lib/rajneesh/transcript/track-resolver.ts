/**
 * Utilities for mapping transcript file paths to catalog track identifiers.
 * Used by both the Pagefind build script and the frontend for playback.
 */

import { getCatalog } from '../stores/catalog.svelte.ts'
import type { Track } from '$lib/library/types.ts'

const BY_OSHO = '-by-osho-'

/**
 * Converts a transcript discourse slug to the catalog track UUID.
 * Catalog uses unpadded track numbers (e.g. "hari-bolo-hari-bol-1")
 * while transcript filenames use zero-padded (e.g. "hari-bolo-hari-bol-01").
 */
export function transcriptPathToTrackUuid(
	seriesSlug: string,
	discourseSlug: string,
): string | null {
	// discourseSlug format: "hari-bolo-hari-bol-01" or "tao-upanishad-127"
	const lastDash = discourseSlug.lastIndexOf('-')
	if (lastDash === -1) return null

	const prefix = discourseSlug.slice(0, lastDash)
	const numStr = discourseSlug.slice(lastDash + 1)
	const num = parseInt(numStr, 10)
	if (Number.isNaN(num)) return null

	return `${prefix}-${num}`
}

/**
 * Extracts the album slug prefix from a series slug.
 * Series format: "hari-bolo-hari-bol-by-osho-01-10" -> "hari-bolo-hari-bol"
 */
export function seriesSlugToAlbumPrefix(seriesSlug: string): string | null {
	const idx = seriesSlug.indexOf(BY_OSHO)
	if (idx === -1) return null
	return seriesSlug.slice(0, idx)
}

/**
 * Gets track data by numeric ID from the in-memory catalog.
 * For use in the frontend (browser) only.
 */
export function getTrackById(trackId: number): Track | null {
	const catalog = getCatalog()
	if (!catalog) return null
	return catalog.tracks.find((t) => t.id === trackId) ?? null
}
