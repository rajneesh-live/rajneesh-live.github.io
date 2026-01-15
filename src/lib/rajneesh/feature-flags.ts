/**
 * Feature flags for Rajneesh-specific functionality.
 * These flags allow easy toggling of fork-specific features
 * to maintain compatibility with upstream.
 */

export interface RajneeshFlags {
	/** Enable remote audio catalog support */
	enableRemoteCatalog: boolean
	/** Enable download-first playback for remote tracks */
	enableDownloadFirst: boolean
	/** Enable debug logging for rajneesh features */
	debugLogging: boolean
}

/**
 * Default feature flags configuration.
 * Set to true to enable rajneesh-specific features.
 */
export const RAJNEESH_FLAGS: RajneeshFlags = {
	enableRemoteCatalog: true,
	enableDownloadFirst: true,
	debugLogging: true, // Enable for development
}

/**
 * Check if rajneesh features are enabled
 */
export const isRajneeshEnabled = (): boolean => {
	return RAJNEESH_FLAGS.enableRemoteCatalog
}

/**
 * Log message if debug logging is enabled
 */
export const rajneeshLog = (message: string, ...args: unknown[]): void => {
	if (RAJNEESH_FLAGS.debugLogging) {
		console.log(`[Rajneesh] ${message}`, ...args)
	}
}
