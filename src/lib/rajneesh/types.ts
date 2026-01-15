/**
 * Rajneesh-specific type definitions.
 * These types extend the base library types to support remote audio content.
 */

/**
 * Represents a remote audio file that must be downloaded before playback.
 * The URL is a download source, NOT a streaming source.
 * Audio is always downloaded to IndexedDB first, then played from cache.
 */
export interface RemoteFile {
	type: 'remote'
	url: string
}

/**
 * Type guard to check if a file entity is a remote file
 */
export const isRemoteFile = (entity: unknown): entity is RemoteFile => {
	return (
		typeof entity === 'object' &&
		entity !== null &&
		'type' in entity &&
		(entity as RemoteFile).type === 'remote' &&
		'url' in entity &&
		typeof (entity as RemoteFile).url === 'string'
	)
}
