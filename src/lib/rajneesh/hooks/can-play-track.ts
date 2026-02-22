import type { FileEntity } from '$lib/helpers/file-system'

export const canPlayTrackFile = async (
	_file: FileEntity,
	_trackId?: string,
): Promise<boolean> => {
	return true
}
