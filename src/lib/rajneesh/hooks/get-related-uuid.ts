import { getDatabase } from '$lib/db/database.ts'
import { isRajneeshEnabled } from '../feature-flags.ts'
import { getCatalog } from '../stores/catalog.svelte.ts'

export const getRelatedUuid = async (
	store: 'albums' | 'artists',
	name: string,
): Promise<string | undefined> => {
	if (isRajneeshEnabled()) {
		const catalog = getCatalog()
		if (catalog) {
			if (store === 'albums') {
				return catalog.albums.find((album) => album.name === name)?.uuid
			}

			if (store === 'artists' && catalog.artist.name === name) {
				return catalog.artist.uuid
			}
		}
	}

	const db = await getDatabase()
	const item = await db.getFromIndex(store, 'name', name)
	return item?.uuid
}
