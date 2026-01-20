<script lang="ts">
	import { afterNavigate } from '$app/navigation'
	import { onMount } from 'svelte'
	import { initPosthog, trackPageview } from '$lib/rajneesh/analytics/posthog'

	const { children } = $props()

	onMount(() => {
		initPosthog()
	})

	afterNavigate((nav) => {
		trackPageview(nav.to?.url?.href)

		if (import.meta.env.DEV) {
			return
		}

		window.goatcounter?.count({
			path: nav.to?.route.id ?? 'unknown',
		})
	})
</script>

{@render children()}
