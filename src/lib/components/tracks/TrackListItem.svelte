<script lang="ts">
	import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'
	import { formatDuration } from '$lib/helpers/utils/format-duration.ts'
	import { formatNameOrUnknown } from '$lib/helpers/utils/text.ts'
	import { createTrackQuery, type TrackData } from '$lib/library/get/value-queries.ts'
	import { DownloadButton } from '$lib/rajneesh/components/index.ts'
	import Artwork from '../Artwork.svelte'
	import ListItem, { type MenuItem } from '../ListItem.svelte'

	interface Props {
		trackId: number
		style?: string
		ariaRowIndex?: number
		active?: boolean
		class?: ClassValue
		menuItems?: (playlist: TrackData) => MenuItem[]
		onclick?: (track: TrackData) => void
	}

	const {
		trackId,
		style,
		active,
		class: className,
		onclick,
		ariaRowIndex,
		menuItems,
	}: Props = $props()

	const query = createTrackQuery(() => trackId)
	const { value: track, loading } = $derived(query)

	const artworkSrc = createManagedArtwork(() => track?.image?.small)

	const menuItemsWithItem = $derived(track && menuItems?.bind(null, track))
</script>

<ListItem
	{style}
	menuItems={menuItemsWithItem}
	tabindex={-1}
	class={[
		'h-18 text-left',
		active ? 'bg-onSurfaceVariant/10 text-onSurfaceVariant' : 'color-onSurfaceVariant',
		className,
	]}
	ariaLabel={m.trackPlay({ name: track?.name ?? '' })}
	{ariaRowIndex}
	onclick={() => onclick?.(track!)}
>
	<div
		role="cell"
		class={['track-item h-full grow items-center gap-5', track && track.duration <= 0 && 'no-duration']}
	>
		<Artwork
			src={artworkSrc()}
			alt={track?.name}
			class={['hidden! h-10 w-10 rounded-sm @xs:flex!', loading && 'opacity-50']}
		/>

		{#if loading}
			<div>
				<div class="mb-2 h-2 rounded-xs bg-onSurface/10"></div>
				<div class="h-1 w-1/8 rounded-xs bg-onSurface/10"></div>
			</div>
		{:else if query.error}
			<div class="text-error">
				Error loading track with id {trackId}
			</div>
		{:else if track}
			<div class={[active ? 'text-primary' : 'color-onSurface', 'line-clamp-2 break-words']}>
				{track.name}
			</div>

			<div class="hidden @4xl:block">
				{formatNameOrUnknown(track.album)}
			</div>

			{#if track.duration > 0}
				<div class="hidden tabular-nums @sm:block">
					{formatDuration(track.duration)}
				</div>
			{/if}

			<DownloadButton
				trackId={track.uuid}
				file={track.file}
			/>
		{/if}
	</div>
</ListItem>

<style>
	.track-item {
		--grid-cols: auto 1fr 56px;
		display: grid;
		grid-template-columns: var(--grid-cols);
	}

	@container (min-width: 24rem) {
		.track-item {
			--grid-cols: auto 1.5fr 74px 56px;
		}

	.track-item.no-duration {
		--grid-cols: auto 1.5fr 56px;
	}
	}

	/* @container (theme('containers.4xl')) { */
	@container (min-width: 56rem) {
		.track-item {
			--grid-cols: auto 1.5fr minmax(200px, 1fr) 74px 56px;
		}

	.track-item.no-duration {
		--grid-cols: auto 1.5fr minmax(200px, 1fr) 56px;
	}
	}
</style>
