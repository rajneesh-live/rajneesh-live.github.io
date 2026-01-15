/**
 * Types for the Rajneesh catalog YAML format.
 * These types define the structure of the bundled content catalog.
 */

/**
 * A single track/discourse in a series
 */
export interface RajneeshTrack {
  /** Unique identifier for the track */
  id: string
  /** Display name of the track */
  name: string
  /** Duration in seconds */
  duration: number
  /** Track number within the series */
  trackNo: number
  /** URL or relative path to the audio file (download source, not streaming) */
  audioUrl: string
  /** Optional description/summary */
  description?: string
  /** Optional topic tags */
  topics?: string[]
}

/**
 * A series of related tracks (becomes an Album in the app)
 */
export interface RajneeshSeries {
  /** Unique identifier for the series */
  id: string
  /** Display name of the series */
  name: string
  /** Optional description */
  description?: string
  /** Year of recording/release */
  year?: string
  /** URL or path to cover image */
  image?: string
  /** Tracks in this series */
  tracks: RajneeshTrack[]
}

/**
 * Catalog metadata
 */
export interface RajneeshCatalogMetadata {
  /** Application name */
  appName: string
  /** Catalog version */
  version: string
  /** Last update timestamp */
  lastUpdated: string
}

/**
 * Root catalog structure
 */
export interface RajneeshCatalog {
  /** All series in the catalog */
  series: RajneeshSeries[]
  /** Catalog metadata */
  metadata: RajneeshCatalogMetadata
}
