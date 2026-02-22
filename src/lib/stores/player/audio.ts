import type { FileEntity } from '$lib/helpers/file-system'
import { isRemoteFile } from '$lib/helpers/file-system'
import { getCachedBlob } from '$lib/rajneesh/index.ts'

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
			if (mode === 'prompt') {
				mode = await track.requestPermission({ mode: 'read' })
			}
		} catch {
			// User activation is required to request permission.
		}

		if (mode !== 'granted') {
			return null
		}
	}

	return track.getFile()
}

export const cleanupTrackAudio = (audio: HTMLAudioElement): void => {
	const currentSrc = audio.src
	if (currentSrc && currentSrc.startsWith('blob:')) {
		URL.revokeObjectURL(currentSrc)
	}
}

export const loadTrackAudio = async (
	audio: HTMLAudioElement,
	entity: FileEntity,
	_trackId?: string,
): Promise<boolean> => {
	cleanupTrackAudio(audio)

	if (isRemoteFile(entity)) {
		console.log(`[Rajneesh] Loading remote track: ${entity.url}`)
		const cachedBlob = await getCachedBlob(entity.url)

		if (cachedBlob) {
			audio.src = URL.createObjectURL(cachedBlob)
			console.log(`[Rajneesh] Track loaded from cache`)
			return true
		}

		audio.src = entity.url
		console.log(`[Rajneesh] Streaming track from remote URL`)
		return true
	}

	const file = await getLocalTrackFile(entity)

	if (!file) {
		return false
	}

	audio.src = URL.createObjectURL(file)
	return true
}
