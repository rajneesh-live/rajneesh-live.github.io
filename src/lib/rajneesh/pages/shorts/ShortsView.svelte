<script lang="ts">
	import { goto } from '$app/navigation'
	import { tick } from 'svelte'
	import Button from '$lib/components/Button.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import { trackShortLiked } from '$lib/rajneesh/analytics/posthog.ts'
	import { lastShortsIndex, setLastShortsIndex } from './shorts-state.ts'
	import { ensureShortByTrackId, getShortsItems, loadMoreShorts } from './shorts-data.ts'
	import { getLikedTrackIds, setTrackLiked } from './shorts-liked-state.ts'
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
let lastThemeAppliedForIndex = -1
let lastUrlUpdatedForIndex = -1
let initialQueryIndex: number | null = null
let isCurrentAudioPlaying = $state(false)
let singleTapTimeout: ReturnType<typeof setTimeout> | null = null
let likedTrackIds = $state(new Set<string>())

const activeTrackLiked = $derived(
	activeIndex >= 0 && !!shorts[activeIndex] && likedTrackIds.has(shorts[activeIndex].trackId)
)

function formatTimestamp(seconds: number): string {
	const mins = Math.floor(seconds / 60)
	const secs = seconds % 60
	return `${mins}:${secs.toString().padStart(2, '0')}`
}

function hslToHex(h: number, s: number, l: number): string {
	const saturation = s / 100
	const lightness = l / 100
	const k = (n: number) => (n + h / 30) % 12
	const a = saturation * Math.min(lightness, 1 - lightness)
	const f = (n: number) =>
		Math.round(255 * (lightness - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))))
	return `#${[f(0), f(8), f(4)].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

function getRandomThemeHex(): string {
	const hue = Math.floor(Math.random() * 360)
	return hslToHex(hue, 72, 52)
}

function applyRandomThemeColor() {
	const mainStore = useMainStore()
	const randomHex = getRandomThemeHex()
	void import('$lib/theme.ts').then(({ updateThemeCssVariables }) => {
		updateThemeCssVariables(randomHex, mainStore.isThemeDark)
	})
}

function updateShortsQueryParams(index: number) {
	const item = shorts[index]
	if (!item) return
	const url = new URL(window.location.href)
	url.searchParams.set('trackId', item.trackId)
	url.searchParams.set('startFrom', String(item.startSeconds))
	history.replaceState(history.state, '', url)
}

function hydrateFromQuery() {
	const url = new URL(window.location.href)
	const trackId = url.searchParams.get('trackId')?.trim()
	const startFromRaw = url.searchParams.get('startFrom')
	const parsedStartFrom = startFromRaw ? Number(startFromRaw) : undefined
	const startFrom = Number.isFinite(parsedStartFrom) ? parsedStartFrom : undefined
	if (!trackId) return

	const index = ensureShortByTrackId(trackId, startFrom)
	if (index < 0) return

	shorts = getShortsItems()
	initialQueryIndex = index
	setLastShortsIndex(index)
	activeIndex = index
}

async function handleShareShort() {
	const item = shorts[activeIndex]
	if (!item) return
	updateShortsQueryParams(activeIndex)
	const shareUrl = window.location.href
	const shareData = {
		title: 'Shorts',
		text: `${item.albumName} - ${item.trackIndex}`,
		url: shareUrl,
	}

	if (navigator.share) {
		try {
			await navigator.share(shareData)
			return
		} catch (err) {
			if ((err as Error).name === 'AbortError') return
		}
	}

	if (navigator.clipboard?.writeText) {
		void navigator.clipboard.writeText(shareUrl)
	}
}

async function toggleLikeActiveShort() {
	const item = shorts[activeIndex]
	if (!item) return

	const willLike = !likedTrackIds.has(item.trackId)
	await setTrackLiked(item.trackId, willLike)

	const next = new Set(likedTrackIds)
	if (willLike) {
		next.add(item.trackId)
		trackShortLiked({ trackId: item.trackId })
	} else {
		next.delete(item.trackId)
	}
	likedTrackIds = next
}

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
		isCurrentAudioPlaying = false
		const audio = getOrCreateAudio(index)
		currentAudio = audio

		audio.onplaying = () => {
			if (currentAudio === audio) {
				isLoading = false
				isCurrentAudioPlaying = true
				syncBgMusic()
			}
		}
		audio.onwaiting = () => {
			if (currentAudio === audio) {
				isLoading = true
				isCurrentAudioPlaying = false
				pauseBgMusic()
			}
		}
		audio.onpause = () => {
			if (currentAudio === audio) {
				isCurrentAudioPlaying = false
			}
		}
		audio.onended = () => {
			if (currentAudio === audio) {
				isCurrentAudioPlaying = false
			}
		}
		audio.onerror = () => {
			if (currentAudio === audio) {
				isCurrentAudioPlaying = false
			}
		}

		audio.currentTime = shorts[index].startSeconds
		audio.play().catch((err) => {
			isCurrentAudioPlaying = false
			if (err.name === 'NotAllowedError') {
				isLoading = false
				autoplayBlocked = true
			}
		})

		preloadAdjacent(index)
	}

function handleSingleTapToggle() {
		if (autoplayBlocked) {
			autoplayBlocked = false
			if (activeIndex >= 0) playSlide(activeIndex)
			return
		}

		if (!currentAudio && activeIndex >= 0) {
			playSlide(activeIndex)
			return
		}

		if (!currentAudio) return

	if (currentAudio.paused) {
			isLoading = true
			void currentAudio.play().catch((err) => {
				isCurrentAudioPlaying = false
				isLoading = false
				if (err?.name === 'NotAllowedError') autoplayBlocked = true
			})
			return
		}

	if (isLoading) {
		return
	}

		currentAudio.pause()
		isCurrentAudioPlaying = false
		isLoading = false
		pauseBgMusic()
	}

function handleUserTap(event: MouseEvent) {
	// Double-tap: like/unlike current short.
	if (event.detail === 2) {
		if (singleTapTimeout) {
			clearTimeout(singleTapTimeout)
			singleTapTimeout = null
		}
		void toggleLikeActiveShort()
		return
	}

	// Single-tap: play/pause toggle (deferred to avoid firing on double-tap).
	if (event.detail === 1) {
		singleTapTimeout = setTimeout(() => {
			handleSingleTapToggle()
			singleTapTimeout = null
		}, 220)
	}
}

	function destroyPool() {
		destroyBgMusic()
		isCurrentAudioPlaying = false
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
		if (activeIndex < 0 || activeIndex === lastThemeAppliedForIndex) return
		lastThemeAppliedForIndex = activeIndex
		applyRandomThemeColor()
	})

	$effect(() => {
		if (activeIndex < 0 || activeIndex === lastUrlUpdatedForIndex) return
		lastUrlUpdatedForIndex = activeIndex
		updateShortsQueryParams(activeIndex)
	})

	$effect(() => {
		let cancelled = false
		void getLikedTrackIds().then((ids) => {
			if (cancelled) return
			likedTrackIds = new Set(ids)
		})
		return () => {
			cancelled = true
		}
	})

	$effect(() => {
		hydrateFromQuery()
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

			const targetIndex = initialQueryIndex ?? lastShortsIndex
			if (targetIndex >= 0 && targetIndex < shorts.length && el.clientHeight > 0) {
				requestAnimationFrame(() => {
					if (cancelled) return
					el.scrollTo({ top: targetIndex * el.clientHeight, behavior: 'auto' })
					activeIndex = targetIndex
					initialQueryIndex = null
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

	$effect(() => () => {
		if (!singleTapTimeout) return
		clearTimeout(singleTapTimeout)
		singleTapTimeout = null
	})
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={viewportEl}
	onclick={handleUserTap}
	class="shorts-viewport -mx-4 flex h-[100dvh] min-h-[100dvh] flex-col overflow-y-auto overscroll-y-none bg-surfaceContainerLow"
	style="scroll-snap-type: y mandatory;"
>
	<div class="pointer-events-none sticky top-3 z-10 mb-1 px-6 text-label-md font-medium uppercase tracking-wide text-onSurface/75">
		Shorts
	</div>

	{#if shorts.length === 0}
		<div class="shorts-slide relative flex min-h-[100dvh] shrink-0 items-center justify-center p-6 text-onSurface">
			<div class="w-full max-w-xl rounded-3xl border border-outlineVariant/40 bg-surfaceContainer p-8 text-center shadow-lg">
				<div class="mb-2 text-title-lg">No shorts yet</div>
				<div class="text-body-md opacity-70">
					Add more tracks to your library to unlock random moments here.
				</div>
			</div>
		</div>
	{:else}
		{#each shorts as item, i (i)}
			<div
				data-slide-index={i}
				class="shorts-slide relative flex min-h-[100dvh] shrink-0 flex-col bg-surfaceContainerLow px-6 pb-8 pt-10 text-onSurface"
				use:observeSlide
			>
				<div class="relative z-10 flex min-h-[calc(100dvh-7rem)] w-full flex-col items-center justify-center">
					<div class="mb-6 flex items-center justify-center">
						<div class="flex size-56 items-center justify-center rounded-full border border-outlineVariant/45 bg-surfaceContainerHigh shadow-inner sm:size-72">
							<Icon
								type="vinylDisc"
								class={[
									'size-24 opacity-70 sm:size-32',
									activeIndex === i && 'disc-spin',
									activeIndex === i && isCurrentAudioPlaying && 'disc-spin-playing',
								]}
							/>
						</div>
					</div>

					<div class="pb-4 text-center">
						<div class="mb-2 text-headline-lg">
							{item.albumName} - {item.trackIndex}
						</div>
						<div class="mb-6 text-title-sm opacity-80 sm:text-title-md">
							Starts at {formatTimestamp(item.startSeconds)}
						</div>

						<div class="flex flex-wrap items-center justify-center gap-3">
							{#if item.albumUuid}
								<Button
									kind="outlined"
									class="text-body-md"
									onclick={(e) => {
										e.stopPropagation()
										void goto(`/library/albums/${item.albumUuid}`)
									}}
								>
									<Icon type="album" class="size-4" />
									Open Album
								</Button>
							{/if}

							{#if activeIndex === i && !isCurrentAudioPlaying && !isLoading && !autoplayBlocked}
								<span class="text-body-md opacity-70">Paused</span>
							{/if}

							{#if activeIndex === i && autoplayBlocked}
								<span class="rounded-full border border-outlineVariant/45 bg-surfaceContainerHigh px-3 py-1.5 text-body-md">
									Tap anywhere to play
								</span>
							{/if}

							{#if activeIndex === i && isLoading}
								<span class="inline-flex items-center gap-2 rounded-full border border-outlineVariant/45 bg-surfaceContainerHigh px-3 py-1.5 text-body-md">
									<div class="loader-inline"></div>
									Loading
								</span>
							{/if}
						</div>
					</div>
				</div>

				{#if i === 0 && showScrollTip}
					<div class="scroll-tip absolute bottom-24 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 rounded-full border border-outlineVariant/40 bg-surfaceContainerHigh px-4 py-2 opacity-85 shadow-md">
						<Icon type="chevronUp" class="size-6 animate-bounce" />
						<span class="text-body-sm">Swipe up for more</span>
					</div>
				{/if}
			</div>
		{/each}
	{/if}
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

	<div class="flex flex-col items-end gap-3">
		<button
			onclick={() => { showBgMusicPicker = !showBgMusicPicker }}
			class={[
				'flex size-10 items-center justify-center rounded-full shadow-lg backdrop-blur-md transition-colors',
				bgMusicPlaying
					? 'bg-secondaryContainer/90 text-onSecondaryContainer'
					: 'bg-surfaceContainer/80 text-onSurface/70',
			]}
		>
			<Icon
				type="vinylDisc"
				class={['size-5 disc-spin-bg', bgMusicPlaying && 'disc-spin-bg-playing']}
			/>
		</button>

		<button
			onclick={toggleLikeActiveShort}
			class={[
				'flex size-10 items-center justify-center rounded-full shadow-lg backdrop-blur-md transition-colors hover:bg-surfaceContainerHigh',
				activeTrackLiked
					? 'bg-secondaryContainer/90 text-onSecondaryContainer'
					: 'bg-surfaceContainer/80 text-onSurface/70',
			]}
		>
			<Icon type={activeTrackLiked ? 'favorite' : 'favoriteOutline'} class="size-5" />
		</button>

		<button
			onclick={handleShareShort}
			class="flex size-10 items-center justify-center rounded-full bg-surfaceContainer/80 text-onSurface/70 shadow-lg backdrop-blur-md transition-colors hover:bg-surfaceContainerHigh"
		>
			<Icon type="openInNew" class="size-5" />
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
	:global(.disc-spin) {
		animation: spin 6s linear infinite;
		animation-play-state: paused;
	}
	:global(.disc-spin-playing) {
		animation-play-state: running;
	}
	:global(.disc-spin-bg) {
		animation: spin 3s linear infinite;
		animation-play-state: paused;
	}
	:global(.disc-spin-bg-playing) {
		animation-play-state: running;
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
