const transcriptPathCache = new Map<string, string | null>()

export function buildTranscriptCandidates(
	trackUuid: string,
	trackNo: number,
	trackOf: number,
): string[] {
	const lastDash = trackUuid.lastIndexOf('-')
	if (lastDash === -1) {
		return []
	}

	const prefix = trackUuid.slice(0, lastDash)
	const num = String(trackNo)
	const count = String(trackOf)

	const discourseWidths = Array.from(
		new Set([num.length, count.length, 2, 3].filter((width) => width >= num.length)),
	).sort((a, b) => a - b)
	const rangeWidths = Array.from(new Set([count.length, 2, 3])).sort((a, b) => a - b)

	const discourseSlugs = Array.from(
		new Set([
			`${prefix}-${num}`,
			...discourseWidths.map((width) => `${prefix}-${num.padStart(width, '0')}`),
		]),
	)

	const seriesSlugs = Array.from(
		new Set(
			rangeWidths.flatMap((width) => [
				`${prefix}-by-osho-1-${count.padStart(width, '0')}`,
				`${prefix}-by-osho-${String(1).padStart(width, '0')}-${count.padStart(width, '0')}`,
				`${prefix}-by-osho-${String(1).padStart(width, '0')}-${count}`,
			]),
		),
	)

	return seriesSlugs.flatMap((seriesSlug) =>
		discourseSlugs.map((discourseSlug) => `/rajneesh/transcripts/${seriesSlug}/${discourseSlug}.txt`),
	)
}

export async function findTranscriptPath(
	trackUuid: string,
	trackNo: number,
	trackOf: number,
): Promise<string | null> {
	const cacheKey = `${trackUuid}:${trackNo}:${trackOf}`
	if (transcriptPathCache.has(cacheKey)) {
		return transcriptPathCache.get(cacheKey) ?? null
	}

	for (const candidate of buildTranscriptCandidates(trackUuid, trackNo, trackOf)) {
		try {
			const response = await fetch(candidate)
			if (response.ok) {
				transcriptPathCache.set(cacheKey, candidate)
				return candidate
			}
		} catch {
			// Ignore missing transcript candidates and keep trying.
		}
	}

	transcriptPathCache.set(cacheKey, null)
	return null
}
