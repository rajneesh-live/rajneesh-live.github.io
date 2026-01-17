import type { Album, Track, UnknownTrack } from '$lib/library/types.ts'
import type { RemoteFile } from '../types.ts'
import { rajneeshLog } from '../feature-flags.ts'
import type { CompactCatalogV1, AlbumTuple, StructuredTuple } from './schema-json.ts'

// Constants duplicated from normalizer to allow standalone operation
export const CATALOG_DIRECTORY_ID = -2
const RAJNEESH_ARTIST = 'Osho'

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

export interface NormalizedCatalog {
	tracks: Track[]
	albums: Album[]
	artist: { id: number; uuid: string; name: string }
}

export const parseCatalogJson = (json: CompactCatalogV1): NormalizedCatalog => {
	const tracks: Track[] = []
	const albums: Album[] = []
	const artistName = json.meta.artist || RAJNEESH_ARTIST

	for (const albumTuple of json.albums) {
		const [
			albumName,
			description,
			isStructured,
			structured,
			coverUrl
		] = albumTuple

		const albumId = hashStringToId(albumName) // Stable ID based on name

		// Create Album entity
		const album: Album = {
			id: albumId,
			uuid: albumName, // Use name as UUID for stability
			name: albumName,
			artists: [artistName],
			year: undefined, // Not in tuple
			image: coverUrl || undefined,
		}
		albums.push(album)

		// Generate Tracks
		if (isStructured && structured) {
			const [count, trackIdTpl, urlPrefix, fileTpl, urlPadWidth] = structured

			for (let i = 1; i <= count; i++) {
				const iStr = i.toString()
				// Pad for URL if needed
				const iPadded = urlPadWidth > 0 ? iStr.padStart(urlPadWidth, '0') : iStr
				
				// Generate values
				const trackName = `${albumName} ${iStr}`
				const trackUuid = trackIdTpl.replace('{i}', iStr)
				const audioUrl = urlPrefix + fileTpl.replace('{i}', iPadded)

				const remoteFile: RemoteFile = {
					type: 'remote',
					url: audioUrl,
				}

				const track: Track = {
					id: hashStringToId(trackUuid),
					uuid: trackUuid,
					name: trackName,
					album: albumName,
					artists: [artistName],
					year: '',
					duration: 0, // Unknown in tuple
					genre: [], // Topics not in tuple yet
					trackNo: i,
					trackOf: count,
					discNo: 1,
					discOf: 1,
					file: remoteFile,
					scannedAt: Date.now(),
					fileName: `${trackUuid}.mp3`,
					directory: CATALOG_DIRECTORY_ID,
					image: undefined,
					primaryColor: undefined,
				}
				tracks.push(track)
			}
		}
	}

	rajneeshLog(`Parsed catalog: ${tracks.length} tracks, ${albums.length} albums`)

	return {
		tracks,
		albums,
		artist: {
			id: hashStringToId(artistName),
			uuid: artistName.toLowerCase(),
			name: artistName,
		},
	}
}
