import { describe, it, expect, beforeEach, vi } from 'vitest'
import 'fake-indexeddb/auto'

// Dynamic import to get fresh module each time
let cacheModule: typeof import('~/lib/rajneesh/cache/audio-cache')

// Reset IndexedDB and reimport module before each test
beforeEach(async () => {
  // Clear all IndexedDB databases
  indexedDB = new IDBFactory()

  // Clear module cache and reimport
  vi.resetModules()
  cacheModule = await import('~/lib/rajneesh/cache/audio-cache')
})

describe('audio-cache', () => {
  const testUrl = 'https://example.com/audio.mp3'
  const testBlob = new Blob(['test audio data'], { type: 'audio/mpeg' })

  describe('isUrlCached', () => {
    it('should return false for uncached URL', async () => {
      const result = await cacheModule.isUrlCached(testUrl)
      expect(result).toBe(false)
    })

    it('should return true for cached URL', async () => {
      await cacheModule.storeBlob(testUrl, testBlob)
      const result = await cacheModule.isUrlCached(testUrl)
      expect(result).toBe(true)
    })
  })

  describe('getCachedBlob', () => {
    it('should return null for uncached URL', async () => {
      const result = await cacheModule.getCachedBlob(testUrl)
      expect(result).toBeNull()
    })

    it('should return blob for cached URL', async () => {
      await cacheModule.storeBlob(testUrl, testBlob)
      const result = await cacheModule.getCachedBlob(testUrl)
      expect(result).toBeInstanceOf(Blob)
      expect(result?.size).toBe(testBlob.size)
    })
  })

  describe('storeBlob', () => {
    it('should store a blob', async () => {
      await cacheModule.storeBlob(testUrl, testBlob)
      const cached = await cacheModule.isUrlCached(testUrl)
      expect(cached).toBe(true)
    })

    it('should overwrite existing blob', async () => {
      const firstBlob = new Blob(['first'], { type: 'audio/mpeg' })
      const secondBlob = new Blob(['second data'], { type: 'audio/mpeg' })

      await cacheModule.storeBlob(testUrl, firstBlob)
      await cacheModule.storeBlob(testUrl, secondBlob)

      const result = await cacheModule.getCachedBlob(testUrl)
      expect(result?.size).toBe(secondBlob.size)
    })

    it('should store with custom content type', async () => {
      await cacheModule.storeBlob(testUrl, testBlob, 'audio/wav')
      const cached = await cacheModule.isUrlCached(testUrl)
      expect(cached).toBe(true)
    })
  })

  describe('removeCachedUrl', () => {
    it('should remove cached URL', async () => {
      await cacheModule.storeBlob(testUrl, testBlob)
      expect(await cacheModule.isUrlCached(testUrl)).toBe(true)

      await cacheModule.removeCachedUrl(testUrl)
      expect(await cacheModule.isUrlCached(testUrl)).toBe(false)
    })

    it('should not throw for non-existent URL', async () => {
      await expect(
        cacheModule.removeCachedUrl('non-existent'),
      ).resolves.not.toThrow()
    })
  })

  describe('clearCache', () => {
    it('should clear all cached entries', async () => {
      await cacheModule.storeBlob('url1', testBlob)
      await cacheModule.storeBlob('url2', testBlob)
      await cacheModule.storeBlob('url3', testBlob)

      expect((await cacheModule.getCacheStats()).count).toBe(3)

      await cacheModule.clearCache()

      expect((await cacheModule.getCacheStats()).count).toBe(0)
    })
  })

  describe('getCacheStats', () => {
    it('should return zero stats for empty cache', async () => {
      const stats = await cacheModule.getCacheStats()
      expect(stats.count).toBe(0)
      expect(stats.totalSize).toBe(0)
    })

    it('should return correct stats', async () => {
      const blob1 = new Blob(['short'], { type: 'audio/mpeg' })
      const blob2 = new Blob(['much longer content'], { type: 'audio/mpeg' })

      await cacheModule.storeBlob('url1', blob1)
      await cacheModule.storeBlob('url2', blob2)

      const stats = await cacheModule.getCacheStats()
      expect(stats.count).toBe(2)
      expect(stats.totalSize).toBe(blob1.size + blob2.size)
    })
  })

  describe('listCachedUrls', () => {
    it('should return empty array for empty cache', async () => {
      const urls = await cacheModule.listCachedUrls()
      expect(urls).toEqual([])
    })

    it('should return all cached URLs', async () => {
      await cacheModule.storeBlob('url1', testBlob)
      await cacheModule.storeBlob('url2', testBlob)
      await cacheModule.storeBlob('url3', testBlob)

      const urls = await cacheModule.listCachedUrls()
      expect(urls).toHaveLength(3)
      expect(urls).toContain('url1')
      expect(urls).toContain('url2')
      expect(urls).toContain('url3')
    })
  })
})
