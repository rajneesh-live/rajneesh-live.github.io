/**
 * SolidJS store for tracking download state.
 * Provides reactive state for the UI.
 */

import { createStore } from 'solid-js/store'
import { onCleanup, createContext, useContext, ParentComponent } from 'solid-js'
import { downloadManager } from '../cache/download-manager'
import { isUrlCached } from '../cache/audio-cache'
import type { DownloadProgress } from '../cache/types'

interface DownloadStoreState {
  downloads: Record<string, DownloadProgress>
  cachedUrls: Set<string>
}

export const createDownloadStore = () => {
  const [state, setState] = createStore<DownloadStoreState>({
    downloads: {},
    cachedUrls: new Set(),
  })

  // Subscribe to download progress updates
  const unsubscribe = downloadManager.subscribeToProgress((progress) => {
    setState('downloads', progress.trackId, progress)

    // Update cached status when download completes
    if (progress.state === 'complete') {
      setState('cachedUrls', (urls) => {
        const newUrls = new Set(urls)
        newUrls.add(progress.url)
        return newUrls
      })
    }
  })

  // Cleanup on unmount
  onCleanup(() => {
    unsubscribe()
  })

  /**
   * Start downloading a track
   */
  const startDownload = (trackId: string, url: string): void => {
    downloadManager.download(trackId, url)
  }

  /**
   * Cancel a download
   */
  const cancelDownload = (trackId: string): void => {
    downloadManager.cancel(trackId)
    setState('downloads', trackId, undefined as unknown as DownloadProgress)
  }

  /**
   * Check if a track is being downloaded
   */
  const isDownloading = (trackId: string): boolean => {
    const progress = state.downloads[trackId]
    return progress?.state === 'downloading' || progress?.state === 'pending'
  }

  /**
   * Check if a URL is cached
   */
  const isCached = (url: string): boolean => {
    return state.cachedUrls.has(url)
  }

  /**
   * Get download progress percentage for a track
   */
  const getProgress = (trackId: string): number => {
    return state.downloads[trackId]?.progress || 0
  }

  /**
   * Get download state for a track
   */
  const getDownloadState = (trackId: string): DownloadProgress | undefined => {
    return state.downloads[trackId]
  }

  /**
   * Check cache status for multiple URLs
   */
  const refreshCacheStatus = async (urls: string[]): Promise<void> => {
    const results = await Promise.all(
      urls.map(async (url) => ({
        url,
        cached: await isUrlCached(url),
      })),
    )

    setState('cachedUrls', (current) => {
      const newUrls = new Set(current)
      results.forEach(({ url, cached }) => {
        if (cached) {
          newUrls.add(url)
        }
      })
      return newUrls
    })
  }

  /**
   * Check cache status for a single URL
   */
  const checkCacheStatus = async (url: string): Promise<boolean> => {
    const cached = await isUrlCached(url)
    if (cached) {
      setState('cachedUrls', (current) => {
        const newUrls = new Set(current)
        newUrls.add(url)
        return newUrls
      })
    }
    return cached
  }

  return {
    state,
    startDownload,
    cancelDownload,
    isDownloading,
    isCached,
    getProgress,
    getDownloadState,
    refreshCacheStatus,
    checkCacheStatus,
  }
}

// Create context for the download store
type DownloadStoreReturn = ReturnType<typeof createDownloadStore>

const DownloadStoreContext = createContext<DownloadStoreReturn>()

/**
 * Provider component for the download store
 */
export const DownloadStoreProvider: ParentComponent = (props) => {
  const store = createDownloadStore()

  return (
    <DownloadStoreContext.Provider value={store}>
      {props.children}
    </DownloadStoreContext.Provider>
  )
}

/**
 * Hook to access the download store
 */
export const useDownloadStore = (): DownloadStoreReturn => {
  const context = useContext(DownloadStoreContext)
  if (!context) {
    throw new Error('useDownloadStore must be used within DownloadStoreProvider')
  }
  return context
}
