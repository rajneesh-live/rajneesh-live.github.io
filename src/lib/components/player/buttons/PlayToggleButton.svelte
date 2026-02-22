<script lang="ts">
	import PlayPauseIcon from '$lib/components/animated-icons/PlayPauseIcon.svelte'
	import Spinner from '$lib/components/Spinner.svelte'
	import IconButton from '../../IconButton.svelte'

	const player = usePlayer()
</script>

<IconButton
	tooltip={player.playing ? m.playerPause() : m.playerPlay()}
	disabled={!player.activeTrack}
	onclick={() => player.togglePlay()}
>
	{#if player.loading}
		<Spinner class="size-6" />
	{:else}
		<PlayPauseIcon playing={player.playing} />
	{/if}
</IconButton>
