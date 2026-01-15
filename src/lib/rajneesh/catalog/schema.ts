/**
 * Runtime validation for Rajneesh catalog data.
 * Provides type-safe validation without heavy dependencies.
 */

import type {
  RajneeshCatalog,
  RajneeshSeries,
  RajneeshTrack,
  RajneeshCatalogMetadata,
} from './types'

export class ValidationError extends Error {
  constructor(message: string, public path: string) {
    super(`Validation error at ${path}: ${message}`)
    this.name = 'ValidationError'
  }
}

const isString = (value: unknown): value is string => typeof value === 'string'
const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && !isNaN(value)
const isArray = (value: unknown): value is unknown[] => Array.isArray(value)
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Validates a single track
 */
export const validateTrack = (
  data: unknown,
  path: string,
): RajneeshTrack => {
  if (!isObject(data)) {
    throw new ValidationError('Expected object', path)
  }

  if (!isString(data.id) || !data.id) {
    throw new ValidationError('id must be a non-empty string', `${path}.id`)
  }
  if (!isString(data.name) || !data.name) {
    throw new ValidationError('name must be a non-empty string', `${path}.name`)
  }
  if (!isNumber(data.duration) || data.duration < 0) {
    throw new ValidationError(
      'duration must be a non-negative number',
      `${path}.duration`,
    )
  }
  if (!isNumber(data.trackNo) || data.trackNo < 1) {
    throw new ValidationError(
      'trackNo must be a positive number',
      `${path}.trackNo`,
    )
  }
  if (!isString(data.audioUrl) || !data.audioUrl) {
    throw new ValidationError(
      'audioUrl must be a non-empty string',
      `${path}.audioUrl`,
    )
  }

  // Optional fields
  if (data.description !== undefined && !isString(data.description)) {
    throw new ValidationError(
      'description must be a string',
      `${path}.description`,
    )
  }
  if (data.topics !== undefined) {
    if (!isArray(data.topics)) {
      throw new ValidationError('topics must be an array', `${path}.topics`)
    }
    for (let i = 0; i < data.topics.length; i++) {
      if (!isString(data.topics[i])) {
        throw new ValidationError(
          'topics must contain only strings',
          `${path}.topics[${i}]`,
        )
      }
    }
  }

  return {
    id: data.id,
    name: data.name,
    duration: data.duration,
    trackNo: data.trackNo,
    audioUrl: data.audioUrl,
    description: data.description as string | undefined,
    topics: data.topics as string[] | undefined,
  }
}

/**
 * Validates a series
 */
export const validateSeries = (
  data: unknown,
  path: string,
): RajneeshSeries => {
  if (!isObject(data)) {
    throw new ValidationError('Expected object', path)
  }

  if (!isString(data.id) || !data.id) {
    throw new ValidationError('id must be a non-empty string', `${path}.id`)
  }
  if (!isString(data.name) || !data.name) {
    throw new ValidationError('name must be a non-empty string', `${path}.name`)
  }
  if (!isArray(data.tracks)) {
    throw new ValidationError('tracks must be an array', `${path}.tracks`)
  }

  // Optional fields
  if (data.description !== undefined && !isString(data.description)) {
    throw new ValidationError(
      'description must be a string',
      `${path}.description`,
    )
  }
  if (data.year !== undefined && !isString(data.year)) {
    throw new ValidationError('year must be a string', `${path}.year`)
  }
  if (data.image !== undefined && !isString(data.image)) {
    throw new ValidationError('image must be a string', `${path}.image`)
  }

  const tracks = data.tracks.map((track, i) =>
    validateTrack(track, `${path}.tracks[${i}]`),
  )

  return {
    id: data.id,
    name: data.name,
    description: data.description as string | undefined,
    year: data.year as string | undefined,
    image: data.image as string | undefined,
    tracks,
  }
}

/**
 * Validates catalog metadata
 */
export const validateMetadata = (
  data: unknown,
  path: string,
): RajneeshCatalogMetadata => {
  if (!isObject(data)) {
    throw new ValidationError('Expected object', path)
  }

  if (!isString(data.appName) || !data.appName) {
    throw new ValidationError(
      'appName must be a non-empty string',
      `${path}.appName`,
    )
  }
  if (!isString(data.version) || !data.version) {
    throw new ValidationError(
      'version must be a non-empty string',
      `${path}.version`,
    )
  }
  if (!isString(data.lastUpdated) || !data.lastUpdated) {
    throw new ValidationError(
      'lastUpdated must be a non-empty string',
      `${path}.lastUpdated`,
    )
  }

  return {
    appName: data.appName,
    version: data.version,
    lastUpdated: data.lastUpdated,
  }
}

/**
 * Validates a complete catalog
 */
export const validateCatalog = (data: unknown): RajneeshCatalog => {
  if (!isObject(data)) {
    throw new ValidationError('Expected object', 'catalog')
  }

  if (!isArray(data.series)) {
    throw new ValidationError('series must be an array', 'catalog.series')
  }
  if (!isObject(data.metadata)) {
    throw new ValidationError('metadata must be an object', 'catalog.metadata')
  }

  const series = data.series.map((s, i) =>
    validateSeries(s, `catalog.series[${i}]`),
  )
  const metadata = validateMetadata(data.metadata, 'catalog.metadata')

  return { series, metadata }
}
