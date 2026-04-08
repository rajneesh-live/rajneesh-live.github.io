const TRANSCRIPT_MANIFEST_URL = '/rajneesh/transcript-manifest.json'

let transcriptManifestPromise: Promise<Map<string, string> | null> | null = null

const loadTranscriptManifest = async (): Promise<Map<string, string> | null> => {
	if (typeof fetch === 'undefined') {
		return null
	}

	if (!transcriptManifestPromise) {
		transcriptManifestPromise = (async () => {
			try {
				const response = await fetch(TRANSCRIPT_MANIFEST_URL)
				if (!response.ok) {
					return null
				}

				const manifest = (await response.json()) as Record<string, string>
				return new Map(
					Object.entries(manifest).filter(
						(entry): entry is [string, string] =>
							typeof entry[0] === 'string' && typeof entry[1] === 'string',
					),
				)
			} catch {
				return null
			}
		})()
	}

	return transcriptManifestPromise
}

export async function findTranscriptPath(trackUuid: string): Promise<string | null> {
	const manifest = await loadTranscriptManifest()
	return manifest?.get(trackUuid) ?? null
}
