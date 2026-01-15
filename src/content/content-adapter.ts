import { Track, Album, Artist, UnknownTrack, MusicItemType } from '../types/types'
import { UNKNOWN_ITEM_ID } from '../types/constants'
import oshoContentYaml from './osho-content.yaml?raw'
import { load as yamlLoad } from 'js-yaml'

// Content structure interfaces
interface ContentTrack {
  id: string
  name: string
  duration: number
  trackNo: number
  audioUrl: string
  description: string
  topics: string[]
}

interface ContentSeries {
  id: string
  name: string
  description: string
  year: string
  image: string
  tracks: ContentTrack[]
}

interface StandaloneTrack extends ContentTrack {
  year: string
}

interface ContentStructure {
  series: ContentSeries[]
  standalone_talks?: StandaloneTrack[]
  topics?: Array<{ id: string; name: string; description: string }>
  metadata: {
    appName: string
    description: string
    version: string
    lastUpdated: string
    totalTracks: number
    totalSeries: number
    defaultTheme: string
  }
}

// Parse YAML content using js-yaml
const parseYAML = (yamlContent: string): ContentStructure => {
  try {
    const parsedContent = yamlLoad(yamlContent) as ContentStructure
    return parsedContent
  } catch (error) {
    console.error('Error parsing YAML content:', error)
    throw new Error('Failed to parse YAML content structure')
  }
}

// Create a file wrapper for URL-based audio files
const createUrlFileWrapper = (audioUrl: string) => ({
  type: 'url' as const,
  url: audioUrl
})

// Transform content into app's data structure
export const transformContentToAppData = () => {
  const content = parseYAML(oshoContentYaml)
  
  const tracks: { [id: string]: Track } = {}
  const albums: { [id: string]: Album } = {}
  const artists: { [id: string]: Artist } = {}
  
  // Create Osho as the main artist
  const oshoArtist: Artist = {
    id: 'osho',
    type: MusicItemType.ARTIST,
    name: 'Osho',
    trackIds: []
  }
  
  // Process series (these become albums)
  content.series.forEach(series => {
    const albumTrackIds: string[] = []
    
    // Process tracks in this series
    series.tracks.forEach(track => {
      const trackData: Track = {
        id: track.id,
        type: MusicItemType.TRACK,
        name: track.name,
        album: series.name,
        artists: ['Osho'],
        year: series.year,
        duration: track.duration,
        genre: track.topics,
        trackNo: track.trackNo,
        fileWrapper: createUrlFileWrapper(track.audioUrl) as any,
        // Add custom properties for Osho content
        description: track.description,
        topics: track.topics,
        // Use album image for all tracks in the series
        image: series.image
      }
      
      tracks[track.id] = trackData
      albumTrackIds.push(track.id)
      oshoArtist.trackIds.push(track.id)
    })
    
    // Create album from series
    const album: Album = {
      id: series.id,
      type: MusicItemType.ALBUM,
      name: series.name,
      artists: ['Osho'],
      year: series.year,
      trackIds: albumTrackIds,
      // Add custom properties
      description: series.description,
      // Use series image for album artwork
      image: series.image
    }
    
    albums[series.id] = album
  })
  
  // Process standalone talks
  content.standalone_talks?.forEach(talk => {
    const trackData: Track = {
      id: talk.id,
      type: MusicItemType.TRACK,
      name: talk.name,
      album: 'Standalone Talks',
      artists: ['Osho'],
      year: talk.year,
      duration: talk.duration,
      genre: talk.topics,
      trackNo: 1,
      fileWrapper: createUrlFileWrapper(talk.audioUrl) as any,
      description: talk.description,
      topics: talk.topics
    }
    
    tracks[talk.id] = trackData
    oshoArtist.trackIds.push(talk.id)
  })
  
  // Create standalone talks album
  const standaloneTrackIds = content.standalone_talks?.map(talk => talk.id) || []
  if (standaloneTrackIds.length > 0) {
    albums['standalone_talks'] = {
      id: 'standalone_talks',
      type: MusicItemType.ALBUM,
      name: 'Standalone Talks',
      artists: ['Osho'],
      trackIds: standaloneTrackIds,
      description: 'Individual talks and discourses'
    }
  }
  
  artists['osho'] = oshoArtist
  
  return {
    tracks,
    albums,
    artists,
    playlists: {},
    favorites: [],
    metadata: content.metadata
  }
}

// Get static content data
export const getStaticContentData = () => {
  return transformContentToAppData()
} 