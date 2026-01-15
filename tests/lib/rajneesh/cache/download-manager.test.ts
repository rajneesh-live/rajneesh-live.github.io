import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import 'fake-indexeddb/auto'

// Dynamic imports for fresh modules
let downloadManagerModule: typeof import('~/lib/rajneesh/cache/download-manager')
let audioCacheModule: typeof import('~/lib/rajneesh/cache/audio-cache')

// Reset IndexedDB and reimport modules before each test
beforeEach(async () => {
  indexedDB = new IDBFactory()
  vi.clearAllMocks()
  vi.resetModules()

  audioCacheModule = await import('~/lib/rajneesh/cache/audio-cache')
  downloadManagerModule = await import('~/lib/rajneesh/cache/download-manager')
})

afterEach(() => {
  vi.restoreAllMocks()
})

// Mock fetch
const createMockResponse = (data: string, options?: ResponseInit) => {
  const blob = new Blob([data], { type: 'audio/mpeg' })
  const response = new Response(blob, {
    status: 200,
    headers: {
      'content-type': 'audio/mpeg',
      'content-length': String(blob.size),
    },
    ...options,
  })
  return response
}

describe('download-manager', () => {
  describe('createDownloadManager', () => {
    it('should create a download manager instance', () => {
      const manager = downloadManagerModule.createDownloadManager()
      expect(manager).toBeDefined()
      expect(manager.download).toBeInstanceOf(Function)
      expect(manager.cancel).toBeInstanceOf(Function)
      expect(manager.getProgress).toBeInstanceOf(Function)
    })
  })

  describe('download', () => {
    it('should download and cache a file', async () => {
      const manager = downloadManagerModule.createDownloadManager()
      const url = 'https://example.com/test.mp3'

      // Mock successful fetch
      vi.spyOn(global, 'fetch').mockResolvedValue(
        createMockResponse('test audio data'),
      )

      const progressUpdates: any[] = []
      manager.subscribeToProgress((progress) => {
        progressUpdates.push({ ...progress })
      })

      manager.download('track1', url)

      // Wait for download to complete
      await vi.waitFor(
        async () => {
          const cached = await audioCacheModule.isUrlCached(url)
          expect(cached).toBe(true)
        },
        { timeout: 5000 },
      )

      // Check progress updates
      expect(progressUpdates.length).toBeGreaterThan(0)
      const lastUpdate = progressUpdates[progressUpdates.length - 1]
      expect(lastUpdate.state).toBe('complete')
      expect(lastUpdate.progress).toBe(100)
    })

    it('should skip already cached URLs', async () => {
      const manager = downloadManagerModule.createDownloadManager()
      const url = 'https://example.com/test.mp3'

      // Pre-cache the URL
      await audioCacheModule.storeBlob(url, new Blob(['cached data']))

      vi.spyOn(global, 'fetch')

      let completeCalled = false
      manager.subscribeToProgress((progress) => {
        if (progress.state === 'complete') {
          completeCalled = true
        }
      })

      manager.download('track1', url)

      await vi.waitFor(() => {
        expect(completeCalled).toBe(true)
      })

      // Should not have fetched since it was already cached
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe('cancel', () => {
    it('should cancel an active download', async () => {
      const manager = downloadManagerModule.createDownloadManager()
      const url = 'https://example.com/test.mp3'

      // Mock slow fetch
      vi.spyOn(global, 'fetch').mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 10000))
        return createMockResponse('test')
      })

      manager.download('track1', url)

      // Wait a bit then cancel
      await new Promise((r) => setTimeout(r, 100))
      manager.cancel('track1')

      expect(manager.isDownloading('track1')).toBe(false)
    })
  })

  describe('isDownloading', () => {
    it('should return false for non-downloading track', () => {
      const manager = downloadManagerModule.createDownloadManager()
      expect(manager.isDownloading('non-existent')).toBe(false)
    })
  })

  describe('getProgress', () => {
    it('should return undefined for non-downloading track', () => {
      const manager = downloadManagerModule.createDownloadManager()
      expect(manager.getProgress('non-existent')).toBeUndefined()
    })

    it('should return progress for downloading track', async () => {
      const manager = downloadManagerModule.createDownloadManager()
      const url = 'https://example.com/test.mp3'

      vi.spyOn(global, 'fetch').mockResolvedValue(
        createMockResponse('test audio data'),
      )

      manager.download('track1', url)

      await vi.waitFor(() => {
        const progress = manager.getProgress('track1')
        expect(progress).toBeDefined()
      })
    })
  })

  describe('cancelAll', () => {
    it('should cancel all downloads', async () => {
      const manager = downloadManagerModule.createDownloadManager()

      // Mock slow fetch
      vi.spyOn(global, 'fetch').mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 5000))
        return createMockResponse('test')
      })

      manager.download('track1', 'url1')
      manager.download('track2', 'url2')

      await new Promise((r) => setTimeout(r, 50))

      manager.cancelAll()

      expect(manager.isDownloading('track1')).toBe(false)
      expect(manager.isDownloading('track2')).toBe(false)
    })
  })
})
