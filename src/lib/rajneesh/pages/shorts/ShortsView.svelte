<script lang="ts">
	import { goto } from '$app/navigation'
	import { tick } from 'svelte'
	import Button from '$lib/components/Button.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import { lastShortsIndex, setLastShortsIndex } from './shorts-state.ts'
	import { getShortsItems, loadMoreShorts } from './shorts-data.ts'

	let shorts = $state(getShortsItems())

	const LOAD_MORE_THRESHOLD = 5 // load more when within 5 slides of the end

	let viewportEl: HTMLDivElement
	let activeIndex = $state<number>(-1)
	let isLoading = $state(true)
	let autoplayBlocked = $state(false)
	let observer: IntersectionObserver | null = null

	// Audio pool: preloaded Audio elements keyed by slide index
	const audioPool = new Map<number, HTMLAudioElement>()
	let currentAudio: HTMLAudioElement | null = null

	function maybeLoadMore(index: number) {
		if (index >= shorts.length - LOAD_MORE_THRESHOLD) {
			loadMoreShorts()
			// Re-read the array reference to trigger Svelte reactivity
			shorts = getShortsItems()
		}
	}

	function getOrCreateAudio(index: number): HTMLAudioElement {
		let audio = audioPool.get(index)
		if (audio) return audio
		audio = new Audio()
		audio.preload = 'auto'
		const { url, startSeconds } = shorts[index]
		audio.src = url
		audio.currentTime = startSeconds
		audioPool.set(index, audio)
		return audio
	}

	function preloadAdjacent(index: number) {
		for (const i of [index - 1, index + 1]) {
			if (i >= 0 && i < shorts.length && !audioPool.has(i)) {
				getOrCreateAudio(i)
			}
		}
		for (const [key, audio] of audioPool) {
			if (Math.abs(key - index) > 1) {
				audio.pause()
				audio.removeAttribute('src')
				audio.load()
				audioPool.delete(key)
			}
		}
	}

	function playSlide(index: number) {
		if (index < 0 || index >= shorts.length) return
		if (document.visibilityState === 'hidden') return

		if (currentAudio) {
			currentAudio.pause()
		}

		isLoading = true
		const audio = getOrCreateAudio(index)
		currentAudio = audio

		audio.onplaying = () => {
			if (currentAudio === audio) isLoading = false
		}
		audio.onwaiting = () => {
			if (currentAudio === audio) isLoading = true
		}

		audio.currentTime = shorts[index].startSeconds
		audio.play().catch((err) => {
			if (err.name === 'NotAllowedError') {
				isLoading = false
				autoplayBlocked = true
			}
		})

		preloadAdjacent(index)
	}

	function handleUserTap() {
		if (!autoplayBlocked) return
		autoplayBlocked = false
		if (activeIndex >= 0) playSlide(activeIndex)
	}

	function stopAudio() {
		if (currentAudio) {
			currentAudio.pause()
			currentAudio = null
		}
	}

	function destroyPool() {
		for (const [, audio] of audioPool) {
			audio.pause()
			audio.removeAttribute('src')
			audio.load()
		}
		audioPool.clear()
		currentAudio = null
	}

	function observeSlide(el: HTMLElement) {
		observer?.observe(el)
	}

	$effect(() => {
		if (activeIndex >= 0) {
			setLastShortsIndex(activeIndex)
			maybeLoadMore(activeIndex)
		}
	})

	$effect(() => {
		if (typeof document === 'undefined') return
		const onVisibility = () => {
			if (document.visibilityState === 'hidden') {
				stopAudio()
			} else if (lastShortsIndex >= 0 && viewportEl) {
				viewportEl.scrollTo({
					top: lastShortsIndex * viewportEl.clientHeight,
					behavior: 'auto',
				})
				playSlide(lastShortsIndex)
			}
		}
		document.addEventListener('visibilitychange', onVisibility)
		return () => document.removeEventListener('visibilitychange', onVisibility)
	})

	$effect(() => {
		const el = viewportEl
		if (!el) return
		let cancelled = false
		tick().then(() => {
			if (cancelled) return
			observer?.disconnect()
			observer = new IntersectionObserver(
				(entries) => {
					for (const e of entries) {
						if (e.isIntersecting && e.intersectionRatio >= 0.5) {
							activeIndex = Number((e.target as HTMLElement).dataset.slideIndex)
							break
						}
					}
				},
				{ root: el, threshold: [0.5] },
			)
			// Observe all existing slides
			el.querySelectorAll('[data-slide-index]').forEach((s) => observer!.observe(s))

			const saved = lastShortsIndex
			if (saved > 0 && saved < shorts.length && el.clientHeight > 0) {
				requestAnimationFrame(() => {
					if (cancelled) return
					el.scrollTo({ top: saved * el.clientHeight, behavior: 'auto' })
					activeIndex = saved
				})
			}
		})
		return () => {
			cancelled = true
			observer?.disconnect()
		}
	})

	$effect(() => {
		if (activeIndex >= 0) playSlide(activeIndex)
	})

	$effect(() => () => destroyPool())
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={viewportEl}
	onclick={handleUserTap}
	class="shorts-viewport -mx-4 flex h-[100dvh] min-h-[100dvh] flex-col overflow-y-auto overscroll-y-none bg-surfaceContainerLow"
	style="scroll-snap-type: y mandatory;"
>
	{#each shorts as item, i (i)}
		<div
			data-slide-index={i}
			class="shorts-slide flex min-h-[100dvh] shrink-0 flex-col items-center justify-center gap-6 px-6 text-onSurface"
			use:observeSlide
		>
			{#if activeIndex === i && isLoading}
				<div class="loader"></div>
			{:else}
				{#if activeIndex === i && autoplayBlocked}
					<span class="text-base opacity-60">Tap to play</span>
				{/if}

				<div class="flex flex-col items-center gap-3 text-center">
					<div class="text-body-sm opacity-50">From</div>
					<div class="text-title-md">
						{item.albumName} - {item.trackIndex}
					</div>

					{#if item.albumUuid}
						<Button
							kind="outlined"
							class="mt-1"
							onclick={(e) => {
								e.stopPropagation()
								void goto(`/library/albums/${item.albumUuid}`)
							}}
						>
							<Icon type="album" class="size-4" />
							Open Album
						</Button>
					{/if}
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.shorts-viewport {
		-webkit-overflow-scrolling: touch;
		touch-action: pan-y;
	}
	.shorts-slide {
		scroll-snap-align: start;
		scroll-snap-stop: always;
	}
	.loader {
		width: 40px;
		height: 40px;
		border: 3px solid currentColor;
		border-bottom-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		opacity: 0.6;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
