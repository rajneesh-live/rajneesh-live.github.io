<script lang="ts">
	import IconButton from '../../IconButton.svelte'

	const { class: className }: { class?: ClassValue } = $props()

	const player = usePlayer()

	const seekBack = () => {
		if (!player.activeTrack) return
		player.seek(Math.max(player.currentTime - 15, 0))
	}
</script>

<IconButton
	tooltip={m.playerSeekBack()}
	disabled={!player.activeTrack}
	class={className}
	onclick={seekBack}
	icon="rewind"
/>
