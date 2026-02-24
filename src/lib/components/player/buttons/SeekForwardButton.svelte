<script lang="ts">
	import IconButton from '../../IconButton.svelte'

	const { class: className }: { class?: ClassValue } = $props()

	const player = usePlayer()

	const seekForward = () => {
		if (!player.activeTrack) return
		player.seek(Math.min(player.currentTime + 15, player.duration || Infinity))
	}
</script>

<IconButton
	tooltip={m.playerSeekForward()}
	disabled={!player.activeTrack}
	class={className}
	onclick={seekForward}
	icon="fastForward"
/>
