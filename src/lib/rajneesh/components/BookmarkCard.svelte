<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import { formatDuration } from '$lib/helpers/utils/format-duration.ts'
	import { formatNameOrUnknown } from '$lib/helpers/utils/text.ts'
	import type { BookmarkItem } from '$lib/bookmarks/bookmark-items.ts'

	interface Props {
		item: BookmarkItem
		onPlay: () => void
		onShare: () => void
	}

	const { item, onPlay, onShare }: Props = $props()
</script>

<div class="relative z-0 flex h-full w-full items-center gap-2 rounded-xl bg-surfaceContainerHigh p-3">
	<div class="min-w-0 flex-1">
		<div class="line-clamp-2 text-title-md text-onSurface">
			{formatNameOrUnknown(item.track.name)}
		</div>

		<div class="mt-1 text-body-sm tabular-nums text-onSurfaceVariant">
			{formatDuration(item.bookmark.timestampSeconds)}
		</div>

		{#if item.bookmark.note}
			<div class="mt-2 line-clamp-2 text-body-sm text-onSurfaceVariant">
				{item.bookmark.note}
			</div>
		{/if}
	</div>

	<div class="ml-auto flex shrink-0 items-center gap-1 self-center">
		<Button
			kind="flat"
			class="min-w-0 rounded-full px-2.5! text-label-md!"
			onclick={onShare}
			tooltip={m.bookmarkShare()}
		>
			<Icon type="shareVariant" />
		</Button>

		<Button
			kind="flat"
			class="min-w-0 rounded-full px-2.5! text-label-md!"
			onclick={onPlay}
			tooltip={m.play()}
		>
			<Icon type="play" />
		</Button>

	</div>
</div>
