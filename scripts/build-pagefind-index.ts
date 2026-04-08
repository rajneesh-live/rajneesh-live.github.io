#!/usr/bin/env node
/**
 * Builds a Pagefind search index from transcript .txt files.
 * Run before vite build so static/pagefind/ is copied to output.
 *
 * Usage: pnpm run build:pagefind
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as pagefind from 'pagefind'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const TRANSCRIPTS_DIR = path.join(ROOT, 'static', 'rajneesh', 'transcripts')
const CATALOG_PATH = path.join(ROOT, 'static', 'rajneesh', 'catalog.json')
const OUTPUT_PATH = path.join(ROOT, 'static', 'pagefind')

// Match parser-json hash for consistent track IDs
const hashStringToId = (str: string): number => {
	let hash = 0
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i)
		hash = (hash << 5) - hash + char
		hash = hash & hash
	}
	return Math.abs(hash) + 1000000
}

function transcriptPathToTrackUuid(discourseSlug: string): string | null {
	const lastDash = discourseSlug.lastIndexOf('-')
	if (lastDash === -1) return null
	const prefix = discourseSlug.slice(0, lastDash)
	const numStr = discourseSlug.slice(lastDash + 1)
	const num = parseInt(numStr, 10)
	if (Number.isNaN(num)) return null
	return `${prefix}-${num}`
}

interface TrackMeta {
	trackId: number
	albumName: string
	trackName: string
}

function buildTrackLookup(catalog: { albums: unknown[] }): Map<string, TrackMeta> {
	const map = new Map<string, TrackMeta>()
	for (const albumTuple of catalog.albums as Array<[string, unknown, boolean, unknown]>) {
		const [albumName, , isStructured, structured] = albumTuple
		if (!isStructured || !structured) continue
		const [count, trackIdTpl] = structured as [number, string]
		for (let i = 1; i <= count; i++) {
			const trackUuid = trackIdTpl.replace('{i}', String(i))
			const trackName = `${albumName} ${i}/${count}`
			map.set(trackUuid, {
				trackId: hashStringToId(trackUuid),
				albumName,
				trackName,
			})
		}
	}
	return map
}

function* walkTranscripts(dir: string): Generator<{ seriesSlug: string; discourseSlug: string; filePath: string }> {
	const entries = fs.readdirSync(dir, { withFileTypes: true })
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			const seriesSlug = entry.name
			const subEntries = fs.readdirSync(fullPath, { withFileTypes: true })
			for (const sub of subEntries) {
				if (sub.isFile() && sub.name.endsWith('.txt')) {
					const discourseSlug = sub.name.slice(0, -4)
					yield { seriesSlug, discourseSlug, filePath: path.join(fullPath, sub.name) }
				}
			}
		}
	}
}

function detectLanguage(content: string): string {
	// Devanagari Unicode range
	const devanagari = /[\u0900-\u097F]/
	return devanagari.test(content) ? 'hi' : 'en'
}

async function main() {
	const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'))
	const trackLookup = buildTrackLookup(catalog)

	const { index } = await pagefind.createIndex()
	let indexed = 0
	let skipped = 0

	for (const { seriesSlug, discourseSlug, filePath } of walkTranscripts(TRANSCRIPTS_DIR)) {
		const trackUuid = transcriptPathToTrackUuid(discourseSlug)
		if (!trackUuid) {
			skipped++
			continue
		}
		const meta = trackLookup.get(trackUuid)
		if (!meta) {
			skipped++
			continue
		}
		const content = fs.readFileSync(filePath, 'utf-8')
		const language = detectLanguage(content)
		const transcriptPath = `/rajneesh/transcripts/${seriesSlug}/${discourseSlug}.txt`
		const { errors } = await index.addCustomRecord({
			url: `/transcript/${trackUuid}`,
			content,
			language,
			meta: {
				title: meta.trackName,
				albumName: meta.albumName,
				trackUuid,
				trackId: String(meta.trackId),
				transcriptPath,
			},
		})
		if (errors?.length) {
			console.error(`Error indexing ${filePath}:`, errors)
		} else {
			indexed++
		}
	}

	fs.mkdirSync(OUTPUT_PATH, { recursive: true })
	await index.writeFiles({ outputPath: OUTPUT_PATH })
	await pagefind.close()

	console.log(`Pagefind index: ${indexed} transcripts indexed, ${skipped} skipped`)
	console.log(`Output: ${OUTPUT_PATH}`)
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
