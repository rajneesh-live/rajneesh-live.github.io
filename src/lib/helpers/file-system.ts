import { isMobile } from '$lib/helpers/utils/ua.ts'
import type { RemoteFile } from '$lib/rajneesh/types.ts'
import { isRemoteFile } from '$lib/rajneesh/types.ts'

export const isFileSystemAccessSupported: boolean = 'showDirectoryPicker' in globalThis

/**
 * FileEntity represents a source for audio playback.
 * - File: Legacy browser file input
 * - FileSystemFileHandle: Modern File System Access API
 * - RemoteFile: Remote audio that must be downloaded first (Rajneesh feature)
 */
export type FileEntity = File | FileSystemFileHandle | RemoteFile

// Re-export for convenience
export type { RemoteFile }
export { isRemoteFile }

const supportedExtensions = ['aac', 'mp3', 'ogg', 'wav', 'flac', 'm4a', 'opus', 'webm']

export const getFileHandlesRecursively = async (
	directory: FileSystemDirectoryHandle,
): Promise<FileSystemFileHandle[]> => {
	const files: FileSystemFileHandle[] = []

	for await (const handle of directory.values()) {
		if (handle.kind === 'file') {
			const isValidFile = supportedExtensions.some((ext) => handle.name.endsWith(`.${ext}`))

			if (isValidFile) {
				files.push(handle)
			}
		} else if (handle.kind === 'directory') {
			const additionalFiles = await getFileHandlesRecursively(handle)

			files.push(...additionalFiles)
		}
	}
	return files
}

const getFilesFromLegacyInputEvent = (e: Event): File[] => {
	const { files } = e.target as HTMLInputElement
	if (!files) {
		return []
	}

	return Array.from(files).filter((file) =>
		supportedExtensions.some((ext) => file.name.endsWith(`.${ext}`)),
	)
}

export const getFilesFromLegacyDirectory = (): Promise<File[]> => {
	const directoryElement = document.createElement('input')
	directoryElement.type = 'file'

	// Mobile devices do not support directory selection,
	// so allow them to pick individual files instead.
	if (isMobile()) {
		directoryElement.accept = supportedExtensions.map((ext) => `.${ext}`).join(', ')

		directoryElement.multiple = true
	} else {
		directoryElement.setAttribute('webkitdirectory', '')
		directoryElement.setAttribute('directory', '')
	}

	const { promise, resolve: resolvePromise } = Promise.withResolvers<File[]>()

	const resolve = (files: File[]) => {
		directoryElement.remove()
		resolvePromise(files)
	}

	directoryElement.addEventListener('change', (e) => {
		resolve(getFilesFromLegacyInputEvent(e))
	})

	directoryElement.addEventListener('cancel', () => {
		resolve([])
	})

	directoryElement.addEventListener('error', () => {
		resolve([])
	})

	// See https://stackoverflow.com/questions/47664777/javascript-file-input-onchange-not-working-ios-safari-only
	directoryElement.style.position = 'fixed'
	directoryElement.style.top = '-100000px'
	directoryElement.style.left = '-100000px'
	document.body.appendChild(directoryElement)

	directoryElement.click()

	return promise
}
