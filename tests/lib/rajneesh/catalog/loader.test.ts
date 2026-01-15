import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { loadCatalog, ValidationError } from '~/lib/rajneesh/catalog'

const fixturesDir = join(__dirname, 'fixtures')

describe('loadCatalog', () => {
  it('should parse valid YAML catalog', () => {
    const yaml = readFileSync(join(fixturesDir, 'valid-catalog.yaml'), 'utf-8')
    const catalog = loadCatalog(yaml)

    expect(catalog.metadata.appName).toBe('Test App')
    expect(catalog.metadata.version).toBe('1.0.0')
    expect(catalog.series).toHaveLength(2)
  })

  it('should validate series structure', () => {
    const yaml = readFileSync(join(fixturesDir, 'valid-catalog.yaml'), 'utf-8')
    const catalog = loadCatalog(yaml)

    const series1 = catalog.series[0]
    expect(series1.id).toBe('test-series-1')
    expect(series1.name).toBe('Test Series One')
    expect(series1.description).toBe('A test series')
    expect(series1.year).toBe('2025')
    expect(series1.tracks).toHaveLength(2)
  })

  it('should validate track structure', () => {
    const yaml = readFileSync(join(fixturesDir, 'valid-catalog.yaml'), 'utf-8')
    const catalog = loadCatalog(yaml)

    const track = catalog.series[0].tracks[0]
    expect(track.id).toBe('track_001')
    expect(track.name).toBe('Track One')
    expect(track.duration).toBe(3600)
    expect(track.trackNo).toBe(1)
    expect(track.audioUrl).toBe('/audio/track_001.mp3')
    expect(track.topics).toEqual(['test', 'demo'])
  })

  it('should handle remote URLs in audioUrl', () => {
    const yaml = readFileSync(join(fixturesDir, 'valid-catalog.yaml'), 'utf-8')
    const catalog = loadCatalog(yaml)

    const track = catalog.series[0].tracks[1]
    expect(track.audioUrl).toBe('https://example.com/track_002.mp3')
  })

  it('should handle optional fields being absent', () => {
    const yaml = readFileSync(join(fixturesDir, 'valid-catalog.yaml'), 'utf-8')
    const catalog = loadCatalog(yaml)

    const series2 = catalog.series[1]
    expect(series2.description).toBeUndefined()
    expect(series2.image).toBeUndefined()

    const track3 = series2.tracks[0]
    expect(track3.description).toBeUndefined()
    expect(track3.topics).toBeUndefined()
  })

  it('should throw ValidationError for invalid YAML', () => {
    const invalidYaml = 'not: valid: yaml: :::'

    expect(() => loadCatalog(invalidYaml)).toThrow(ValidationError)
  })

  it('should throw ValidationError for missing required fields', () => {
    const yaml = readFileSync(
      join(fixturesDir, 'invalid-catalog.yaml'),
      'utf-8',
    )

    expect(() => loadCatalog(yaml)).toThrow(ValidationError)
  })

  it('should throw ValidationError for non-object input', () => {
    const yaml = '"just a string"'

    expect(() => loadCatalog(yaml)).toThrow(ValidationError)
  })

  it('should throw ValidationError for missing series array', () => {
    const yaml = `
metadata:
  appName: Test
  version: "1.0"
  lastUpdated: "2026-01-01"
# series is missing
`

    expect(() => loadCatalog(yaml)).toThrow(ValidationError)
  })
})
