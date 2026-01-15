/**
 * Download-first playback resolver.
 * 
 * Resolves FileRemote tracks by downloading to cache first,
 * then returning a blob URL for playback.
 * 
 * Audio is NEVER streamed directly from remote URLs.
 */

import { getCachedBlob, storeBlob } from '../cache/audio-cache'

/**
 * Resolve a remote URL from cache only (for playback).
 * 
 * Does NOT attempt to download - only returns cached content.
 * Returns null if URL is not cached (user should download first).
 * 
 * @param url - The remote URL to resolve
 * @returns A blob URL if cached, null if not cached
 */
export const resolveRemoteUrl = async (url: string): Promise<string | null> => {
  console.log(`[Resolver] Resolving from cache: ${url}`)

  const blob = await getCachedBlob(url)

  if (!blob) {
    console.log(`[Resolver] Not cached, download required: ${url}`)
    return null
  }

  console.log(`[Resolver] Cache hit: ${url}`)

  // Create blob URL for playback
  const blobUrl = URL.createObjectURL(blob)
  console.log(`[Resolver] Created blob URL: ${blobUrl}`)

  return blobUrl
}

/**
 * Resolve a remote URL, downloading if not cached.
 * 
 * Used by the download manager for explicit downloads.
 * 
 * 1. Check if URL is already cached in IndexedDB
 * 2. If cached, create blob URL from stored blob
 * 3. If not cached, download entire file, store in cache, then create blob URL
 * 
 * @param url - The remote URL to resolve (download source)
 * @returns A blob URL that can be used as audio.src
 */
export const resolveRemoteUrlWithDownload = async (url: string): Promise<string> => {
  console.log(`[Resolver] Resolving with download: ${url}`)

  // Check cache first
  let blob = await getCachedBlob(url)

  if (blob) {
    console.log(`[Resolver] Cache hit: ${url}`)
  } else {
    // Download the entire file
    console.log(`[Resolver] Cache miss, downloading: ${url}`)

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to download: HTTP ${response.status}`)
    }

    const contentType = response.headers.get('content-type') || 'audio/mpeg'

    // Download as blob (waits for full download)
    blob = await response.blob()

    if (blob.size === 0) {
      throw new Error('Downloaded file is empty')
    }

    console.log(`[Resolver] Downloaded: ${url} (${blob.size} bytes)`)

    // Store in cache
    await storeBlob(url, blob, contentType)
  }

  // Create blob URL for playback
  const blobUrl = URL.createObjectURL(blob)
  console.log(`[Resolver] Created blob URL: ${blobUrl}`)

  return blobUrl
}

/**
 * Revoke a blob URL when no longer needed.
 * Call this when track changes or playback ends.
 */
export const revokeBlobUrl = (blobUrl: string): void => {
  if (blobUrl.startsWith('blob:')) {
    URL.revokeObjectURL(blobUrl)
    console.log(`[Resolver] Revoked blob URL: ${blobUrl}`)
  }
}
