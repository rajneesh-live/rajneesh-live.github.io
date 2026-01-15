/**
 * Normalizes Rajneesh catalog data into upstream entity format.
 * Transforms RajneeshCatalog into Track/Album/Artist entities.
 */

import type { Track, Album, Artist, Playlist } from '~/types/types'
import { MusicItemType } from '~/types/types'
import type { RajneeshCatalog } from './types'

/**
 * Result of normalizing a catalog to entities
 */
export interface NormalizedEntities {
  tracks: Record<string, Track>
  albums: Record<string, Album>
  artists: Record<string, Artist>
  playlists: Record<string, Playlist>
  favorites: string[]
}

/**
 * The single artist ID used for all Rajneesh content
 */
const ARTIST_ID = 'rajneesh'
const ARTIST_NAME = 'Rajneesh'

/**
 * Normalize a Rajneesh catalog into upstream entity format.
 *
 * - Each series becomes an Album
 * - Each track in a series becomes a Track with FileRemote fileWrapper
 * - A single Artist "Rajneesh" is created for all content
 */
export const normalizeToEntities = (
  catalog: RajneeshCatalog,
): NormalizedEntities => {
  const tracks: Record<string, Track> = {}
  const albums: Record<string, Album> = {}
  const artists: Record<string, Artist> = {}

  // Create the single artist for all content
  artists[ARTIST_ID] = {
    id: ARTIST_ID,
    type: MusicItemType.ARTIST,
    name: ARTIST_NAME,
    trackIds: [],
  }

  // Process each series as an album
  catalog.series.forEach((series) => {
    const albumTrackIds: string[] = []

    // Process tracks in this series
    series.tracks.forEach((track) => {
      const trackEntity: Track = {
        id: track.id,
        type: MusicItemType.TRACK,
        name: track.name,
        album: series.name,
        artists: [ARTIST_NAME],
        year: series.year,
        duration: track.duration,
        trackNo: track.trackNo,
        genre: track.topics || [],
        // FileRemote: URL is download source, audio is cached before playback
        fileWrapper: { type: 'remote', url: track.audioUrl },
        // Use series image for track artwork
        image: series.image,
      }

      tracks[track.id] = trackEntity
      albumTrackIds.push(track.id)
      artists[ARTIST_ID].trackIds.push(track.id)
    })

    // Create album from series
    const albumEntity: Album = {
      id: series.id,
      type: MusicItemType.ALBUM,
      name: series.name,
      artists: [ARTIST_NAME],
      year: series.year,
      trackIds: albumTrackIds,
      image: series.image,
    }

    albums[series.id] = albumEntity
  })

  return {
    tracks,
    albums,
    artists,
    playlists: {},
    favorites: [],
  }
}
