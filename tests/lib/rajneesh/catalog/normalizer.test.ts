import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { loadCatalog, normalizeToEntities } from '~/lib/rajneesh/catalog'
import { MusicItemType } from '~/types/types'

const fixturesDir = join(__dirname, 'fixtures')

describe('normalizeToEntities', () => {
  const getTestCatalog = () => {
    const yaml = readFileSync(join(fixturesDir, 'valid-catalog.yaml'), 'utf-8')
    return loadCatalog(yaml)
  }

  it('should create Track entities with correct type', () => {
    const catalog = getTestCatalog()
    const entities = normalizeToEntities(catalog)

    expect(Object.keys(entities.tracks)).toHaveLength(3)

    const track = entities.tracks['track_001']
    expect(track.type).toBe(MusicItemType.TRACK)
    expect(track.id).toBe('track_001')
    expect(track.name).toBe('Track One')
  })

  it('should create FileRemote wrapper for audio URLs', () => {
    const catalog = getTestCatalog()
    const entities = normalizeToEntities(catalog)

    const track = entities.tracks['track_001']
    expect(track.fileWrapper).toEqual({
      type: 'remote',
      url: '/audio/track_001.mp3',
    })

    const track2 = entities.tracks['track_002']
    expect(track2.fileWrapper).toEqual({
      type: 'remote',
      url: 'https://example.com/track_002.mp3',
    })
  })

  it('should create Album entities from series', () => {
    const catalog = getTestCatalog()
    const entities = normalizeToEntities(catalog)

    expect(Object.keys(entities.albums)).toHaveLength(2)

    const album = entities.albums['test-series-1']
    expect(album.type).toBe(MusicItemType.ALBUM)
    expect(album.id).toBe('test-series-1')
    expect(album.name).toBe('Test Series One')
    expect(album.trackIds).toEqual(['track_001', 'track_002'])
    expect(album.year).toBe('2025')
    expect(album.image).toBe('/images/test.webp')
  })

  it('should create a single Rajneesh artist', () => {
    const catalog = getTestCatalog()
    const entities = normalizeToEntities(catalog)

    expect(Object.keys(entities.artists)).toHaveLength(1)

    const artist = entities.artists['rajneesh']
    expect(artist.type).toBe(MusicItemType.ARTIST)
    expect(artist.id).toBe('rajneesh')
    expect(artist.name).toBe('Rajneesh')
    expect(artist.trackIds).toHaveLength(3)
  })

  it('should assign tracks to Rajneesh artist', () => {
    const catalog = getTestCatalog()
    const entities = normalizeToEntities(catalog)

    const track = entities.tracks['track_001']
    expect(track.artists).toEqual(['Rajneesh'])
  })

  it('should use series name as track album', () => {
    const catalog = getTestCatalog()
    const entities = normalizeToEntities(catalog)

    const track = entities.tracks['track_001']
    expect(track.album).toBe('Test Series One')
  })

  it('should use series image for track image', () => {
    const catalog = getTestCatalog()
    const entities = normalizeToEntities(catalog)

    const track = entities.tracks['track_001']
    expect(track.image).toBe('/images/test.webp')

    // Series without image
    const track3 = entities.tracks['track_003']
    expect(track3.image).toBeUndefined()
  })

  it('should map topics to genre array', () => {
    const catalog = getTestCatalog()
    const entities = normalizeToEntities(catalog)

    const track = entities.tracks['track_001']
    expect(track.genre).toEqual(['test', 'demo'])

    // Track without topics
    const track3 = entities.tracks['track_003']
    expect(track3.genre).toEqual([])
  })

  it('should initialize empty playlists and favorites', () => {
    const catalog = getTestCatalog()
    const entities = normalizeToEntities(catalog)

    expect(entities.playlists).toEqual({})
    expect(entities.favorites).toEqual([])
  })

  it('should preserve track ordering in albums', () => {
    const catalog = getTestCatalog()
    const entities = normalizeToEntities(catalog)

    const album = entities.albums['test-series-1']
    expect(album.trackIds[0]).toBe('track_001')
    expect(album.trackIds[1]).toBe('track_002')
  })
})
