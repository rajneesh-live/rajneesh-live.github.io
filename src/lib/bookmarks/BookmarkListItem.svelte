<script lang="ts">
	import IconButton from '$lib/components/IconButton.svelte'
	import ListItem from '$lib/components/ListItem.svelte'
	import { formatDuration } from '$lib/helpers/utils/format-duration.ts'
	import { formatNameOrUnknown } from '$lib/helpers/utils/text.ts'
	import type { BookmarkItem } from './bookmark-items.ts'

	interface Props {
		item: BookmarkItem
		onPlay: () => void
		onShare: () => void
		onEdit: () => void
		onDelete: () => void
	}

	const { item, onPlay, onShare, onEdit, onDelete }: Props = $props()

	const menuItems = () => [
		{
			label: m.bookmarkEdit(),
			action: onEdit,
		},
		{
			label: m.bookmarkDelete(),
			action: onDelete,
		},
	]
</script>

<ListItem ariaLabel={m.trackPlay({ name: item.track.name })} menuItems={menuItems} onclick={onPlay}>
	<div role="cell" class="bookmark-item h-full grow items-center gap-4 py-4">
		<div class="grid min-w-0 gap-1">
			<div class="line-clamp-2 text-body-lg text-onSurface">
				{formatNameOrUnknown(item.track.name)}
			</div>

			<div class="text-body-sm tabular-nums text-onSurfaceVariant">
				{formatDuration(item.bookmark.timestampSeconds)}
			</div>

			{#if item.bookmark.note}
				<div class="line-clamp-2 text-body-sm text-onSurfaceVariant">
					{item.bookmark.note}
				</div>
			{/if}
		</div>

		<div class="ml-auto flex items-center gap-1">
			<IconButton
				icon="play"
				tooltip={m.play()}
				onclick={(event) => {
					event.stopPropagation()
					onPlay()
				}}
			/>
			<IconButton
				icon="shareVariant"
				tooltip={m.bookmarkShare()}
				onclick={(event) => {
					event.stopPropagation()
					onShare()
				}}
			/>
		</div>
	</div>
</ListItem>

<style>
	.bookmark-item {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
	}
</style>
