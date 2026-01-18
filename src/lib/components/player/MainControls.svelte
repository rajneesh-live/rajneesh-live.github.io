<script lang="ts">
	import PlayNextButton from './buttons/PlayNextButton.svelte'
	import PlayPrevButton from './buttons/PlayPrevButton.svelte'
	import PlayTogglePillButton from './buttons/PlayTogglePillButton.svelte'
	import RepeatButton from './buttons/RepeatButton.svelte'
	import ShuffleButton from './buttons/ShuffleButton.svelte'
	import { isRajneeshEnabled } from '$lib/rajneesh/index.ts'
	import SpeedControlButton from '$lib/rajneesh/components/player/SpeedControlButton.svelte'

	const { class: className }: { class?: ClassValue } = $props()
</script>

<div class={['flex items-center gap-2', className]}>
	<ShuffleButton />

	<PlayPrevButton />

	<PlayTogglePillButton />

	<PlayNextButton />

	{#if isRajneeshEnabled()}
		<SpeedControlButton />
	{:else}
		<RepeatButton />
	{/if}
</div>
