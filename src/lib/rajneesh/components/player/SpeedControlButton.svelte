<script lang="ts">
	import IconButton from '$lib/components/IconButton.svelte'

	const { class: className }: { class?: ClassValue } = $props()
</script>

<IconButton
	icon="speedometerSlow"
	tooltip="Speed control Not implemented yet"
	class={className}
/>
