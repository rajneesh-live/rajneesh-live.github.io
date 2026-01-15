/**
 * Valibot schema for catalog validation.
 * Provides runtime validation with TypeScript type inference.
 */

import * as v from 'valibot'
import type {
	RajneeshCatalog,
	RajneeshCatalogMetadata,
	RajneeshSeries,
	RajneeshTrack,
} from './types.ts'

/**
 * Schema for a single track
 */
export const RajneeshTrackSchema = v.object({
	id: v.pipe(v.string(), v.minLength(1)),
	name: v.pipe(v.string(), v.minLength(1)),
	duration: v.pipe(v.number(), v.minValue(0)),
	trackNo: v.pipe(v.number(), v.integer(), v.minValue(1)),
	audioUrl: v.pipe(v.string(), v.minLength(1)),
	description: v.optional(v.string()),
	topics: v.optional(v.array(v.string())),
})

/**
 * Schema for a series (album)
 */
export const RajneeshSeriesSchema = v.object({
	id: v.pipe(v.string(), v.minLength(1)),
	name: v.pipe(v.string(), v.minLength(1)),
	description: v.optional(v.string()),
	year: v.optional(v.string()),
	image: v.optional(v.string()),
	tracks: v.pipe(v.array(RajneeshTrackSchema), v.minLength(1)),
})

/**
 * Schema for catalog metadata
 */
export const RajneeshCatalogMetadataSchema = v.object({
	appName: v.pipe(v.string(), v.minLength(1)),
	version: v.pipe(v.string(), v.minLength(1)),
	lastUpdated: v.pipe(v.string(), v.minLength(1)),
})

/**
 * Schema for the root catalog
 */
export const RajneeshCatalogSchema = v.object({
	series: v.pipe(v.array(RajneeshSeriesSchema), v.minLength(1)),
	metadata: RajneeshCatalogMetadataSchema,
})

/**
 * Custom validation error class
 */
export class CatalogValidationError extends Error {
	constructor(
		message: string,
		public readonly path: string,
		public readonly issues?: v.BaseIssue<unknown>[],
	) {
		super(message)
		this.name = 'CatalogValidationError'
	}
}

/**
 * Validate raw data against the catalog schema
 * @throws CatalogValidationError if validation fails
 */
export const validateCatalog = (data: unknown): RajneeshCatalog => {
	const result = v.safeParse(RajneeshCatalogSchema, data)

	if (!result.success) {
		const firstIssue = result.issues[0]
		const path = firstIssue?.path?.map((p) => p.key).join('.') ?? 'catalog'
		const message = `Catalog validation failed at '${path}': ${firstIssue?.message ?? 'Unknown error'}`

		throw new CatalogValidationError(message, path, result.issues)
	}

	return result.output as RajneeshCatalog
}

/**
 * Validate a single track
 */
export const validateTrack = (data: unknown): RajneeshTrack => {
	const result = v.safeParse(RajneeshTrackSchema, data)

	if (!result.success) {
		const firstIssue = result.issues[0]
		throw new CatalogValidationError(
			`Track validation failed: ${firstIssue?.message ?? 'Unknown error'}`,
			'track',
			result.issues,
		)
	}

	return result.output as RajneeshTrack
}

/**
 * Validate a series
 */
export const validateSeries = (data: unknown): RajneeshSeries => {
	const result = v.safeParse(RajneeshSeriesSchema, data)

	if (!result.success) {
		const firstIssue = result.issues[0]
		throw new CatalogValidationError(
			`Series validation failed: ${firstIssue?.message ?? 'Unknown error'}`,
			'series',
			result.issues,
		)
	}

	return result.output as RajneeshSeries
}
