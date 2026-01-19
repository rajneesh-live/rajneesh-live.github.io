/**
 * JSON Compact Catalog Schema
 * Defined as tuples for minimal file size
 */

export type CompactCatalogV1 = {
	version: number
	meta: {
		appName: string
		updatedAt: string
		catalogVersion: string
		artist: string
	}
	directContactLink?: string
	fallbackImage?: string
	legend: unknown // Ignore legend at runtime
	albums: AlbumTuple[]
}

export type AlbumTuple = [
	string, // albumName
	string | null, // description
	boolean, // isStructured
	StructuredTuple | null, // structured
	string | null, // coverUrl
]

export type StructuredTuple = [
	number, // count
	string, // trackIdTemplate
	string, // audioUrlPrefix
	string, // audioFileTemplate
	number, // urlPadWidth
]
