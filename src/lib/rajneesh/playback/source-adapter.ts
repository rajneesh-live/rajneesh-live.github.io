/**
 * Source adapter for integrating with the audio player.
 * 
 * Provides a unified interface for resolving track sources,
 * whether they are local files or remote URLs.
 */

import type { FileWrapper, Track } from '~/types/types'
import { resolveRemoteUrl, revokeBlobUrl } from './resolver'

/**
 * Check if a FileWrapper is a remote source
 */
export const isRemoteSource = (fileWrapper: FileWrapper): boolean => {
  return fileWrapper.type === 'remote'
}

/**
 * Get the remote URL from a FileWrapper
 */
export const getRemoteUrl = (fileWrapper: FileWrapper): string | null => {
  if (fileWrapper.type === 'remote') {
    return fileWrapper.url
  }
  return null
}

/**
 * Resolve a track's audio source to a playable format.
 * 
 * For remote sources (FileRemote), downloads to cache and returns blob URL.
 * For local sources, returns the file directly (handled by upstream).
 * 
 * @param track - The track to resolve
 * @returns A File for local sources, or a blob URL string for remote sources
 */
export const resolveTrackSource = async (
  track: Track,
): Promise<File | string | null> => {
  const { fileWrapper } = track

  if (!fileWrapper) {
    return null
  }

  // Handle remote sources - download first, then return blob URL
  if (fileWrapper.type === 'remote') {
    try {
      const blobUrl = await resolveRemoteUrl(fileWrapper.url)
      return blobUrl
    } catch (error) {
      console.error(`[SourceAdapter] Failed to resolve remote source:`, error)
      throw error
    }
  }

  // Handle local file sources (upstream behavior)
  if (fileWrapper.type === 'file') {
    return fileWrapper.file
  }

  // Handle file reference sources (upstream behavior)
  if (fileWrapper.type === 'fileRef') {
    const fileHandle = fileWrapper.file

    let mode = await fileHandle.queryPermission({ mode: 'read' })
    if (mode !== 'granted') {
      try {
        if (mode === 'prompt') {
          mode = await fileHandle.requestPermission({ mode: 'read' })
        }
      } catch {
        // User activation required for permission request
      }

      if (mode !== 'granted') {
        return null // Permission denied
      }
    }

    return fileHandle.getFile()
  }

  return null
}

/**
 * Clean up resources when a track source is no longer needed
 */
export const cleanupTrackSource = (source: File | string | null): void => {
  if (typeof source === 'string') {
    revokeBlobUrl(source)
  }
  // File objects don't need cleanup
}
