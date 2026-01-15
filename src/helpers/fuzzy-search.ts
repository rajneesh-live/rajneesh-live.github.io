import * as fuzzysort from 'fuzzysort'
import { BaseMusicItem, Track, Album, Artist, Playlist } from '../types/types'

// Type for fuzzy search results
export interface FuzzySearchResult<T> {
  item: T
  score: number
  highlighted?: {
    name?: string
    artist?: string
    album?: string
  }
}

// Configuration for fuzzy search
export interface FuzzySearchOptions {
  threshold?: number  // Minimum score threshold (default: -1000)
  limit?: number      // Maximum number of results (default: 100)
  all?: boolean       // Return all results even if no matches (default: false)
}

// Utility function to prepare search targets for tracks
const prepareTrackSearchTargets = (track: Track) => {
  const targets = [
    { target: track.name, key: 'name' },
    { target: track.artists.join(' '), key: 'artists' },
  ]
  
  if (track.album) {
    targets.push({ target: track.album, key: 'album' })
  }
  
  if (track.description) {
    targets.push({ target: track.description, key: 'description' })
  }
  
  if (track.topics) {
    targets.push({ target: track.topics.join(' '), key: 'topics' })
  }
  
  return targets
}

// Fuzzy search for tracks with multiple field support
export const fuzzySearchTracks = (
  query: string,
  tracks: Track[],
  options: FuzzySearchOptions = {}
): FuzzySearchResult<Track>[] => {
  const { threshold = -1000, limit = 100, all = false } = options
  
  if (!query.trim() && !all) {
    return []
  }
  
  if (!query.trim() && all) {
    return tracks.map(track => ({
      item: track,
      score: 0
    }))
  }
  
  // Prepare search data
  const searchData = tracks.map(track => ({
    track,
    targets: prepareTrackSearchTargets(track)
  }))
  
  // Perform fuzzy search across all targets
  const results: Array<{
    track: Track
    result: any
    score: number
    matchedField: string
  }> = []
  
  searchData.forEach(({ track, targets }) => {
    targets.forEach(({ target, key }) => {
      const result = fuzzysort.single(query, target)
      if (result && result.score >= threshold) {
        results.push({
          track,
          result,
          score: result.score,
          matchedField: key
        })
      }
    })
  })
  
  // Sort by score (higher is better) and remove duplicates
  const uniqueResults = new Map<string, {
    track: Track
    score: number
    matchedField: string
    result: any
  }>()
  
  results.forEach(item => {
    const existing = uniqueResults.get(item.track.id)
    if (!existing || item.score > existing.score) {
      uniqueResults.set(item.track.id, item)
    }
  })
  
  // Convert to final format and sort
  const finalResults = Array.from(uniqueResults.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ track, score, result, matchedField }) => ({
      item: track,
      score,
      highlighted: {
        [matchedField]: result.highlight ? result.highlight('<b>', '</b>') : undefined
      }
    }))
  
  return finalResults
}

// Simple fuzzy search for items with just name field
export const fuzzySearchByName = <T extends BaseMusicItem>(
  query: string,
  items: T[],
  options: FuzzySearchOptions = {}
): FuzzySearchResult<T>[] => {
  const { threshold = -1000, limit = 100, all = false } = options
  
  if (!query.trim() && !all) {
    return []
  }
  
  if (!query.trim() && all) {
    return items.map(item => ({
      item,
      score: 0
    }))
  }
  
  // Use fuzzysort to search
  const results = fuzzysort.go(query, items, {
    key: 'name',
    threshold,
    limit,
    all
  })
  
  return results.map(result => ({
    item: result.obj,
    score: result.score,
    highlighted: {
      name: result.highlight('<b>', '</b>')
    }
  }))
}

// Filter function that maintains the existing API but uses fuzzy search
export const createFuzzyFilter = <T extends BaseMusicItem>(
  searchFunction: (query: string, items: T[], options?: FuzzySearchOptions) => FuzzySearchResult<T>[]
) => {
  return (term: string, items: T[]): T[] => {
    const results = searchFunction(term, items, { threshold: -500 })
    return results.map(result => result.item)
  }
}

// Compatibility function for the existing search filter API
export const fuzzyFilterTracks = (term: string, tracks: Track[]): Track[] => {
  const results = fuzzySearchTracks(term, tracks, { threshold: -500 })
  return results.map(result => result.item)
}

export const fuzzyFilterByName = <T extends BaseMusicItem>(term: string, items: T[]): T[] => {
  const results = fuzzySearchByName(term, items, { threshold: -500 })
  return results.map(result => result.item)
} 