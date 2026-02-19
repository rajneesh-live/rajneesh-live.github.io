<script lang="ts">
	import { goto } from '$app/navigation'
	import { tick } from 'svelte'
	import Button from '$lib/components/Button.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import { lastShortsIndex, setLastShortsIndex } from './shorts-state.ts'
	import { getShortsItems, loadMoreShorts } from './shorts-data.ts'
	import {
		BG_MUSIC_OPTIONS,
		getSelectedBgMusic,
		setSelectedBgMusic,
		getBgMusicVolume,
		setBgMusicVolume,
	} from './bg-music-state.ts'

	let shorts = $state(getShortsItems())

	const LOAD_MORE_THRESHOLD = 5
	const SCROLL_TIP_KEY = 'shorts-scroll-tip-shown'

	let viewportEl: HTMLDivElement
	let activeIndex = $state<number>(-1)
	let isLoading = $state(true)
	let autoplayBlocked = $state(false)
	let showScrollTip = $state(!localStorage.getItem(SCROLL_TIP_KEY))
	let observer: IntersectionObserver | null = null

	let selectedBgMusicId = $state(getSelectedBgMusic())
	let showBgMusicPicker = $state(false)
	let bgAudio: HTMLAudioElement | null = null
	let bgMusicPlaying = $state(false)
	let bgVolume = $state(getBgMusicVolume())

	function selectBgMusic(id: string) {
		selectedBgMusicId = id
		setSelectedBgMusic(id)
		showBgMusicPicker = false

		if (bgAudio) {
			bgAudio.pause()
			bgAudio.removeAttribute('src')
			bgAudio.load()
			bgAudio = null
			bgMusicPlaying = false
		}

		const option = BG_MUSIC_OPTIONS.find((o) => o.id === id)
		if (option?.url && currentAudio && !currentAudio.paused) {
			bgAudio = new Audio(option.url)
			bgAudio.loop = true
			bgAudio.volume = bgVolume
			bgAudio.play().then(() => {
				bgMusicPlaying = true
			}).catch(() => {
				bgMusicPlaying = false
			})
		}
	}

	function syncBgMusic() {
		const option = BG_MUSIC_OPTIONS.find((o) => o.id === selectedBgMusicId)
		if (!option?.url) {
			if (bgAudio) {
				bgAudio.pause()
				bgAudio = null
			}
			bgMusicPlaying = false
			return
		}

		if (!bgAudio) {
			bgAudio = new Audio(option.url)
			bgAudio.loop = true
			bgAudio.volume = bgVolume
			bgAudio.addEventListener('loadedmetadata', () => {
				if (bgAudio) bgAudio.currentTime = Math.random() * bgAudio.duration
			}, { once: true })
		}
		bgAudio.play().then(() => {
			bgMusicPlaying = true
		}).catch(() => {
			bgMusicPlaying = false
		})
	}

	function pauseBgMusic() {
		bgAudio?.pause()
		bgMusicPlaying = false
	}

	function onBgVolumeChange() {
		setBgMusicVolume(bgVolume)
		if (bgAudio) bgAudio.volume = bgVolume
	}

	function destroyBgMusic() {
		if (bgAudio) {
			bgAudio.pause()
			bgAudio.removeAttribute('src')
			bgAudio.load()
			bgAudio = null
		}
		bgMusicPlaying = false
	}

	$effect(() => {
		if (showScrollTip && activeIndex > 0) {
			showScrollTip = false
			localStorage.setItem(SCROLL_TIP_KEY, '1')
		}
	})

	const audioPool = new Map<number, HTMLAudioElement>()
	let currentAudio: HTMLAudioElement | null = null

	function maybeLoadMore(index: number) {
		if (index >= shorts.length - LOAD_MORE_THRESHOLD) {
			loadMoreShorts()
			shorts = getShortsItems()
		}
	}

	function getOrCreateAudio(index: number): HTMLAudioElement {
		let audio = audioPool.get(index)
		if (audio) return audio
		audio = new Audio()
		audio.preload = 'auto'
		audio.crossOrigin = 'anonymous'
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

		if (currentAudio) {
			currentAudio.pause()
		}

		isLoading = true
		const audio = getOrCreateAudio(index)
		currentAudio = audio

		audio.onplaying = () => {
			if (currentAudio === audio) {
				isLoading = false
				syncBgMusic()
			}
		}
		audio.onwaiting = () => {
			if (currentAudio === audio) {
				isLoading = true
				pauseBgMusic()
			}
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

	function destroyPool() {
		destroyBgMusic()
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
			class="shorts-slide relative flex min-h-[100dvh] shrink-0 flex-col items-center justify-center gap-6 px-6 text-onSurface"
			use:observeSlide
		>
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

				{#if activeIndex === i && autoplayBlocked}
					<span class="text-base opacity-60">Tap to play</span>
				{/if}

				{#if activeIndex === i && isLoading}
					<div class="loader-inline mt-1"></div>
				{/if}
			</div>

			{#if i === 0 && showScrollTip}
				<div class="scroll-tip absolute bottom-24 flex flex-col items-center gap-1 opacity-60">
					<Icon type="chevronUp" class="size-6 animate-bounce" />
					<span class="text-body-sm">Swipe up for more</span>
				</div>
			{/if}
		</div>
	{/each}
</div>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- Background music picker — pinned bottom-right -->
<div
	class="pointer-events-auto fixed right-4 z-10"
	style="bottom: calc(var(--bottom-overlay-height, 64px) + 12px);"
	onclick={(e) => e.stopPropagation()}
>
	{#if showBgMusicPicker}
		<div class="mb-2 min-w-44 rounded-2xl bg-surfaceContainer/95 px-3 py-3 shadow-xl backdrop-blur-lg">
			<div class="px-3 pb-2 pt-1 text-body-sm font-medium opacity-50">Background Music</div>
			{#each BG_MUSIC_OPTIONS as option (option.id)}
				<button
					onclick={() => selectBgMusic(option.id)}
					class={[
						'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-body-sm transition-colors',
						selectedBgMusicId === option.id
							? 'bg-secondaryContainer/80 text-onSecondaryContainer'
							: 'text-onSurface/80 hover:bg-onSurface/5',
					]}
				>
					<Icon
						type={option.url ? 'musicNote' : 'close'}
						class="size-4 shrink-0"
					/>
					<span>{option.title}</span>
				</button>
			{/each}

			{#if selectedBgMusicId !== 'none'}
				<div class="mt-1 border-t border-onSurface/10 px-1 pt-3 pb-1">
					<div class="flex items-center gap-2">
						<Icon type="volumeMid" class="size-3.5 shrink-0 opacity-50" />
						<input
							type="range"
							min="0"
							max="1"
							step="0.01"
							bind:value={bgVolume}
							oninput={onBgVolumeChange}
							class="bg-music-slider flex-1"
						/>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<div class="flex justify-end">
		<button
			onclick={() => { showBgMusicPicker = !showBgMusicPicker }}
			class={[
				'flex size-10 items-center justify-center rounded-full shadow-lg backdrop-blur-md transition-colors',
				bgMusicPlaying
					? 'bg-secondaryContainer/90 text-onSecondaryContainer'
					: 'bg-surfaceContainer/80 text-onSurface/70',
			]}
		>
			<Icon type="vinylDisc" class={['size-5', bgMusicPlaying && 'animate-[spin_3s_linear_infinite]']} />
		</button>
	</div>
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
	.loader-inline {
		width: 14px;
		height: 14px;
		border: 2px solid currentColor;
		border-bottom-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.bg-music-slider {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 3px;
		border-radius: 2px;
		background: currentColor;
		opacity: 0.25;
		outline: none;
	}
	.bg-music-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: currentColor;
		cursor: pointer;
	}
	.bg-music-slider::-moz-range-thumb {
		width: 14px;
		height: 14px;
		border: none;
		border-radius: 50%;
		background: currentColor;
		cursor: pointer;
	}
</style>
