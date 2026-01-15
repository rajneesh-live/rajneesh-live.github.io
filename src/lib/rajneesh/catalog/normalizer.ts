/**
 * Normalizer to convert Rajneesh catalog entries to app library types.
 * Transforms series/tracks into Album/Track entities compatible with the main app.
 */

import type { Album, Track, UnknownTrack } from '$lib/library/types.ts'
import type { RemoteFile } from '../types.ts'
import { rajneeshLog } from '../feature-flags.ts'
import type { RajneeshCatalog, RajneeshSeries, RajneeshTrack } from './types.ts'

/**
 * Artist name for all Rajneesh content
 */
const RAJNEESH_ARTIST = 'Osho'

/**
 * Directory ID for remote/catalog content (-2 to distinguish from local directories)
 */
export const CATALOG_DIRECTORY_ID = -2

/**
 * Generate a deterministic numeric ID from a string
 * Uses a simple hash to create consistent IDs for catalog items
 */
const hashStringToId = (str: string): number => {
	let hash = 0
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i)
		hash = (hash << 5) - hash + char
		hash = hash & hash // Convert to 32-bit integer
	}
	// Ensure positive and add offset to avoid conflicts with local IDs
	return Math.abs(hash) + 1000000
}

/**
 * Convert a Rajneesh track to an UnknownTrack (pre-import format)
 */
export const normalizeTrack = (
	track: RajneeshTrack,
	series: RajneeshSeries,
): UnknownTrack => {
	const remoteFile: RemoteFile = {
		type: 'remote',
		url: track.audioUrl,
	}

	return {
		uuid: track.id,
		name: track.name,
		album: series.name,
		artists: [RAJNEESH_ARTIST],
		year: series.year ?? '',
		duration: track.duration,
		genre: track.topics ?? [],
		trackNo: track.trackNo,
		trackOf: series.tracks.length,
		discNo: 1,
		discOf: 1,
		file: remoteFile,
		scannedAt: Date.now(),
		fileName: `${track.id}.mp3`,
		directory: CATALOG_DIRECTORY_ID,
		// Image will be set separately if series has image
		image: undefined,
		primaryColor: undefined,
	}
}

/**
 * Convert a Rajneesh track to a full Track entity with ID
 */
export const normalizeTrackWithId = (
	track: RajneeshTrack,
	series: RajneeshSeries,
): Track => {
	const unknownTrack = normalizeTrack(track, series)

	return {
		...unknownTrack,
		id: hashStringToId(track.id),
		name: track.name,
	}
}

/**
 * Convert a Rajneesh series to an Album entity
 */
export const normalizeSeries = (series: RajneeshSeries): Album => {
	return {
		id: hashStringToId(series.id),
		uuid: series.id,
		name: series.name,
		artists: [RAJNEESH_ARTIST],
		year: series.year,
		// Image will be a URL string for remote images
		image: series.image ? undefined : undefined, // Blob type expected, handle separately
	}
}

/**
 * Result of normalizing a full catalog
 */
export interface NormalizedCatalog {
	tracks: Track[]
	albums: Album[]
	artist: { id: number; uuid: string; name: string }
}

/**
 * Normalize an entire catalog into app-compatible entities
 */
export const normalizeCatalog = (catalog: RajneeshCatalog): NormalizedCatalog => {
	const tracks: Track[] = []
	const albums: Album[] = []

	for (const series of catalog.series) {
		// Create album from series
		albums.push(normalizeSeries(series))

		// Create tracks from series tracks
		for (const track of series.tracks) {
			tracks.push(normalizeTrackWithId(track, series))
		}
	}

	rajneeshLog(`Normalized catalog: ${tracks.length} tracks, ${albums.length} albums`)

	return {
		tracks,
		albums,
		artist: {
			id: hashStringToId(RAJNEESH_ARTIST),
			uuid: RAJNEESH_ARTIST.toLowerCase(),
			name: RAJNEESH_ARTIST,
		},
	}
}

/**
 * Get track by ID from normalized tracks
 */
export const findTrackById = (tracks: Track[], trackId: string): Track | undefined => {
	return tracks.find((t) => t.uuid === trackId)
}

/**
 * Get all tracks for a series/album
 */
export const getTracksForAlbum = (tracks: Track[], albumName: string): Track[] => {
	return tracks.filter((t) => t.album === albumName)
}
