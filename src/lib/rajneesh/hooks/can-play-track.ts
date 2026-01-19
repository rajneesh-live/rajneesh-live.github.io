import type { FileEntity } from '$lib/helpers/file-system'
import { snackbar } from '$lib/components/snackbar/snackbar.ts'
import { downloadTrack, isRemoteFile, isUrlCached } from '$lib/rajneesh/index.ts'

export const canPlayTrackFile = async (
	file: FileEntity,
	trackId?: string,
): Promise<boolean> => {
	if (!isRemoteFile(file)) {
		return true
	}

	const cached = await isUrlCached(file.url)
	if (!cached) {
		snackbar({
			id: 'download-required',
			message: 'Download this track first to play it offline',
			controls: {
				label: m.download(),
				action: () => {
					if (trackId) {
						downloadTrack(trackId, file.url)
					}
				},
			},
			duration: 4000,
		})
		return false
	}

	return true
}
