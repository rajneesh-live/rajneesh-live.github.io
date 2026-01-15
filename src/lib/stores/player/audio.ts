import type { FileEntity } from '$lib/helpers/file-system'
import { isRemoteFile } from '$lib/helpers/file-system'
import { getCachedBlob } from '$lib/rajneesh/index.ts'
import { snackbarItems } from '$lib/components/snackbar/store.svelte.ts'

export type PlayerRepeat = 'none' | 'one' | 'all'

/**
 * Get a File object from a local FileEntity (File or FileSystemFileHandle)
 */
const getLocalTrackFile = async (
	track: Exclude<FileEntity, { type: 'remote' }>,
): Promise<File | null> => {
	if (track instanceof File) {
		return track
	}

	let mode = await track.queryPermission({ mode: 'read' })
	if (mode !== 'granted') {
		try {
			// Try to request permission if it's not denied.
			if (mode === 'prompt') {
				mode = await track.requestPermission({ mode: 'read' })
			}
		} catch {
			// User activation is required to request permission. Catch the error.
		}

		if (mode !== 'granted') {
			return null
		}
	}

	return track.getFile()
}

/**
 * Get a Blob from a remote file entity via the audio cache
 * Returns null if the audio is not cached (user must download first)
 */
const getRemoteTrackBlob = async (url: string): Promise<Blob | null> => {
	const cachedBlob = await getCachedBlob(url)

	if (!cachedBlob) {
		console.log(`[Rajneesh] Remote track not cached, download required: ${url}`)
		return null
	}

	console.log(`[Rajneesh] Playing from cache: ${url}`)
	return cachedBlob
}

export const cleanupTrackAudio = (audio: HTMLAudioElement): void => {
	const currentSrc = audio.src
	if (currentSrc) {
		URL.revokeObjectURL(currentSrc)
	}
}

export const loadTrackAudio = async (
	audio: HTMLAudioElement,
	entity: FileEntity,
): Promise<boolean> => {
	cleanupTrackAudio(audio)

	// Handle remote files (Rajneesh catalog content)
	if (isRemoteFile(entity)) {
		console.log(`[Rajneesh] Loading remote track: ${entity.url}`)
		const blob = await getRemoteTrackBlob(entity.url)

		if (!blob) {
			// Not cached - user must download first
			console.log(`[Rajneesh] Track not cached, showing snackbar`)
			// Show snackbar to inform user
			const snackbarId = 'download-required'
			const existingIndex = snackbarItems.findIndex((s) => s.id === snackbarId)
			const snackbarData = {
				id: snackbarId,
				message: 'Download this track first to play it offline',
				duration: 4000,
			}
			if (existingIndex > -1) {
				snackbarItems[existingIndex] = snackbarData
			} else {
				snackbarItems.push(snackbarData)
			}
			return false
		}

		audio.src = URL.createObjectURL(blob)
		console.log(`[Rajneesh] Track loaded from cache successfully`)
		return true
	}

	// Handle local files (original upstream behavior)
	const file = await getLocalTrackFile(entity)

	if (!file) {
		return false
	}

	audio.src = URL.createObjectURL(file)
	return true
}
