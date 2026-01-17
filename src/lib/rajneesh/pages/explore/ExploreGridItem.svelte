<script lang="ts" module>
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import type { RouteId } from '$app/types'
	import { ripple } from '$lib/attachments/ripple.ts'
	import type { QueryResult } from '$lib/db/query/query.ts'
	import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte.ts'
	import { dbGetAlbumTracksIdsByName } from '$lib/library/get/ids'
	import type { AlbumData } from '$lib/library/get/value'
	import { createAlbumQuery } from '$lib/library/get/value-queries'
	import Artwork from '$lib/components/Artwork.svelte'
	import { snackbar } from '$lib/components/snackbar/snackbar.ts'

	export interface ExploreItemGridItemProps {
		itemId: number
		class: ClassValue
		style: string
		children: Snippet<[AlbumData]>
	}
</script>

<script lang="ts">
	const {
		itemId,
		class: className,
		children,
		...props
	}: ExploreItemGridItemProps = $props()

	const menu = useMenu()
	const main = useMainStore()
	const player = usePlayer()

	const query = createAlbumQuery(() => itemId) as QueryResult<AlbumData>
	const { value: item } = $derived(query)

	const artworkSrc = createManagedArtwork(() => {
		return item ? item.image : undefined
	})

	const linkProps = $derived.by(() => {
		const item = query.value
		if (!item) {
			return null
		}

		// Currently Explore items link to Album details
		const resolvedHref = resolve('/(app)/library/[[slug=libraryEntities]]/[uuid]', {
			slug: 'albums',
			uuid: item.uuid,
		})

		return {
			href: resolvedHref,
			shouldReplace: false, // Don't replace state when navigating from Explore
		}
	})

	const menuItems = () => {
		if (!item || !linkProps) {
			return []
		}

		return [
			{
				label: m.libraryViewDetails(),
				action: () => {
					goto(linkProps.href, { replaceState: linkProps.shouldReplace })
				},
			},
			{
				label: m.playerAddToQueue(),
				action: async () => {
					try {
						const tracksIds = await dbGetAlbumTracksIdsByName(item.name)

						player.addToQueue(tracksIds)
					} catch (error) {
						snackbar.unexpectedError(error)
					}
				},
			},
			{
				label: m.libraryAddToPlaylist(),
				action: async () => {
					try {
						const tracksIds = await dbGetAlbumTracksIdsByName(item.name)

						main.addTrackToPlaylistDialogOpen = tracksIds
					} catch (error) {
						snackbar.unexpectedError(error)
					}
				},
			},
			{
				label: m.libraryRemoveFromLibrary(),
				action: () => {
					main.removeLibraryItemOpen = {
						id: item.id,
						name: item.name,
						storeName: 'albums',
					}
				},
			},
		]
	}
</script>

<a
	{@attach ripple()}
	{...props}
	role="listitem"
	class={[className, 'interactable flex flex-col rounded-lg bg-surfaceContainerHigh']}
	href={linkProps?.href}
	data-sveltekit-replacestate={linkProps?.shouldReplace}
	oncontextmenu={(e) => {
		e.preventDefault()
		menu.showFromEvent(e, menuItems(), {
			anchor: false,
			position: { top: e.y, left: e.x },
		})
	}}
>
	<Artwork
		src={artworkSrc()}
		fallbackIcon="album"
		class="w-full rounded-[inherit]"
	/>

	<div
		class="flex h-18 w-full flex-col justify-center overflow-hidden px-2 text-center text-onSurfaceVariant"
	>
		{#if query.loading}
			<div class="mb-2 h-2 rounded-xs bg-onSurface/10"></div>
			<div class="h-1 w-1/8 rounded-xs bg-onSurface/20"></div>
		{:else if query.error}
			{m.errorUnexpected()}
		{:else if item}
			{@render children(item)}
		{/if}
	</div>
</a>
