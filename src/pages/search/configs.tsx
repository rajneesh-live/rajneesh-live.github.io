import { BaseMusicItem, Track } from '../../types/types'
import * as configs from '../../base-page-configs'
import { fuzzyFilterTracks, fuzzyFilterByName } from '../../helpers/fuzzy-search'

export const SEARCH_MAIN_PATH = '/search/:searchTerm?'

export interface SearchPageConfig extends configs.BaseConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter: (term: string, items: any[]) => any[]
}

// Fuzzy search filter for tracks that searches across name, artist, album, description, and topics
const fuzzyFilterForTracks = (term: string, tracks: Track[]): Track[] => {
  return fuzzyFilterTracks(term, tracks)
}

// Fuzzy search filter for items that searches by name only
const fuzzyFilterForName = <T extends BaseMusicItem>(term: string, items: T[]): T[] => {
  return fuzzyFilterByName(term, items)
}

export const CONFIGS: readonly SearchPageConfig[] = [
  {
    ...configs.BASE_TRACKS_CONFIG,
    filter: fuzzyFilterForTracks,
  },
  {
    ...configs.BASE_ARTISTS_CONFIG,
    filter: fuzzyFilterForName,
  },
  {
    ...configs.BASE_ALBUMS_CONFIG,
    filter: fuzzyFilterForName,
  },
  {
    ...configs.BASE_PLAYLISTS_CONFIG,
    filter: fuzzyFilterForName,
  },
] as const
