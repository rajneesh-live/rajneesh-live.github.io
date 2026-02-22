<script lang="ts">
	import PlayPauseIcon from '../../animated-icons/PlayPauseIcon.svelte'
	import Spinner from '$lib/components/Spinner.svelte'
	import Button from '../../Button.svelte'

	const player = usePlayer()
</script>

<Button
	tooltip={player.playing ? m.playerPause() : m.playerPlay()}
	class="w-18 !p-0"
	disabled={!player.activeTrack}
	onclick={() => player.togglePlay()}
>
	{#if player.loading}
		<Spinner class="size-6" />
	{:else}
		<PlayPauseIcon playing={player.playing} />
	{/if}
</Button>
