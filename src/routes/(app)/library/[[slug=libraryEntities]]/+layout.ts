import { redirect } from '@sveltejs/kit'
import { innerWidth } from 'svelte/reactivity/window'
import type { RouteId } from '$app/types'
import type { LayoutMode } from '$lib/components/ListDetailsLayout.svelte'
import { checkForV1LegacyDatabaseData } from '$lib/db/v1-legacy/database.ts'
import { getLibraryItemIds } from '$lib/library/get/ids.ts'
import {
	createLibraryItemKeysPageQuery,
	type PageQueryResult,
} from '$lib/library/get/ids-queries.ts'
import { createTracksCountPageQuery } from '$lib/library/tracks-queries.ts'
import {
	type LibraryStoreName,
} from '$lib/library/types.ts'
import { isRajneeshEnabled } from '$lib/rajneesh/feature-flags.ts'
import { whenCatalogReady } from '$lib/rajneesh/stores/catalog.svelte.ts'
import { getPersistedLibrarySplitLayoutEnabled } from '$lib/stores/main/store.svelte.ts'
import { defineViewTransitionMatcher } from '$lib/view-transitions.svelte.ts'
import type { LayoutLoad } from './$types.ts'
import { configsMap, type LibraryRouteConfig, type LibrarySearchFn } from './config.ts'
import { LibraryStore } from './store.svelte.ts'

type LibraryRouteSlug = LibraryStoreName | 'bookmarks'

const defaultSearchFn: LibrarySearchFn<{ name: string }> = (value, searchTerm) =>
	value.name.toLowerCase().includes(searchTerm)

type LoadDataResult<Slug extends LibraryRouteSlug> = {
	[ExactSlug in Slug]: LibraryRouteConfig<LibraryStoreName> & {
		slug: ExactSlug
		store: LibraryStore<ExactSlug>
		itemsIdsQuery: PageQueryResult<number[]>
		tracksCountQuery: PageQueryResult<number>
	}
}[Slug]

const loadData = async <Slug extends LibraryRouteSlug>(
	slug: Slug,
): Promise<LoadDataResult<Slug>> => {
	const storeName = slug === 'bookmarks' ? 'playlists' : slug
	const config = configsMap[storeName]
	const searchFn = config.search ?? defaultSearchFn
	const store = new LibraryStore(slug as any)

	if (slug === 'home' || slug === 'shorts' || slug === 'bookmarks') {
		return {
			...config,
			slug,
			store,
			itemsIdsQuery: { value: [] },
			tracksCountQuery: { value: 0 },
		} as any
	}

	const itemsIdsQueryPromise = createLibraryItemKeysPageQuery(storeName, {
		key: () => [storeName, store.sortByKey, store.order, store.searchTerm],
		fetcher: async ([name, sortKey, order, searchTerm]) => {
			const normalizedSearchTerm = searchTerm.toLowerCase()
			const result = await getLibraryItemIds(name, {
				sort: sortKey,
				order,
				searchTerm: normalizedSearchTerm,
				searchFn: (value) => searchFn(value, normalizedSearchTerm),
			})

			return result
		},
	})

	const [itemsIdsQuery, tracksCountQuery] = await Promise.all([
		await itemsIdsQueryPromise,
		createTracksCountPageQuery(),
	])

	return {
		...config,
		slug,
		store,
		itemsIdsQuery,
		tracksCountQuery,
	}
}

type LoadResult = LoadDataResult<LibraryRouteSlug> & {
	isWideLayout: () => boolean
	layoutMode: (
		splitViewAllowed: boolean,
		isWide: boolean,
		itemId: string | undefined,
	) => LayoutMode
}

export const load: LayoutLoad = async (event): Promise<LoadResult> => {
	const { slug } = event.params
	if (!slug) {
		redirect(301, '/library/shorts')
	}

	if (slug === 'playlists') {
		redirect(301, event.params.uuid ? `/library/bookmarks/${event.params.uuid}` : '/library/bookmarks')
	}

	if (isRajneeshEnabled() && slug !== 'home') {
		await whenCatalogReady()
	}

	const data = await loadData(slug)

	if (data.tracksCountQuery.value === 0 && slug !== 'home' && slug !== 'shorts' && slug !== 'bookmarks') {
		const hasV1Data = await checkForV1LegacyDatabaseData()

		if (hasV1Data) {
			redirect(307, '/v1-migration')
		}
	}

	const isWideLayout = () => (innerWidth.current ?? 0) > 1154
	// We pass params here so that inside page we can benefit from $derived caching
	const layoutMode = (
		splitViewAllowed: boolean,
		isWide: boolean,
		itemUuid: string | undefined,
	): LayoutMode => {
		if (slug === 'tracks' || slug === 'home' || slug === 'shorts') {
			return 'list'
		}

		if (isWide && splitViewAllowed) {
			return 'both'
		}

		if (itemUuid) {
			return 'details'
		}

		return 'list'
	}

	defineViewTransitionMatcher((to, from) => {
		const libraryRoute: RouteId = '/(app)/library/[[slug=libraryEntities]]'
		const detailsRoute: RouteId = '/(app)/library/[[slug=libraryEntities]]/[uuid]'

		if (to === libraryRoute && from === libraryRoute) {
			return { view: 'library' }
		}

		const mode = event.untrack(() =>
			layoutMode(getPersistedLibrarySplitLayoutEnabled(), isWideLayout(), event.params.uuid),
		)
		if (mode !== 'both') {
			return null
		}

		if (
			(to === detailsRoute && from === libraryRoute) ||
			(to === libraryRoute && from === detailsRoute) ||
			(to === detailsRoute && from === detailsRoute)
		) {
			return { view: 'library' }
		}

		return null
	})

	return {
		...data,
		isWideLayout,
		layoutMode,
	}
}
