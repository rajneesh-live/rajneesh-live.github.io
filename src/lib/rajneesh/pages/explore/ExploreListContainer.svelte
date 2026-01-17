<script lang="ts">
	import { formatArtists, formatNameOrUnknown } from '$lib/helpers/utils/text.ts'
	import ExploreGridListContainer from './ExploreGridListContainer.svelte'

	interface Props {
		items: number[]
	}

	const { items }: Props = $props()
</script>

<ExploreGridListContainer {items}>
	{#snippet item(album)}
		<div class="truncate text-onSurface">
			{formatNameOrUnknown(album.name)}
		</div>
		<div class="truncate">
			{formatArtists(album.artists)}
		</div>
	{/snippet}
</ExploreGridListContainer>
