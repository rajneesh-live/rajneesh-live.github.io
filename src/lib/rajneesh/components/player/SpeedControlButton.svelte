<script lang="ts">
	import IconButton from '$lib/components/IconButton.svelte'
	import Icon, { type IconType } from '$lib/components/icon/Icon.svelte'

	const { class: className }: { class?: ClassValue } = $props()

	const player = usePlayer()

	const iconMap: Record<number, IconType> = {
		1: 'speedometerSlow',
		1.25: 'speedometerMedium',
		1.5: 'speedometerMedium',
		1.75: 'speedometerHigh',
		2: 'speedometerHigh',
	}

	const formatSpeed = (value: number): string => {
		return value % 1 === 0 ? `${value.toFixed(0)}x` : `${value}x`
	}

	const label = $derived(formatSpeed(player.playbackRate))
	const icon = $derived(iconMap[player.playbackRate] ?? 'speedometerSlow')
	const tooltip = $derived(`Speed ${label}`)
</script>

<IconButton tooltip={tooltip} class={className} onclick={player.togglePlaybackRate}>
	<div class="flex flex-col items-center leading-none">
		<Icon type={icon} class="size-6" />
		<span class="mt-0.5 text-[10px] font-medium tabular-nums">{label}</span>
	</div>
</IconButton>
