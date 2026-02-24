<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import {
		extractExcerptAroundMatch,
		highlightExcerpt,
	} from '$lib/rajneesh/transcript/excerpt.ts'
	import { romanToDevanagariForSearch } from '$lib/rajneesh/transcript/roman-to-devanagari.ts'

	interface Props {
		searchTerm: string
	}

	const { searchTerm }: Props = $props()

	const player = usePlayer()

	const PAGE_SIZE = 20

	type PagefindResult = {
		id: string
		data: () => Promise<{
			url: string
			excerpt: string
			meta?: {
				title?: string
				albumName?: string
				trackId?: string
				transcriptPath?: string
			}
		}>
	}

	type DisplayItem = {
		id: string
		excerpt: string
		trackName: string
		albumName: string
		trackId: number
		exactMatch: boolean
	}

	async function processResult(
		result: PagefindResult,
		term: string,
	): Promise<DisplayItem | null> {
		const data = await result.data()
		const trackId = data.meta?.trackId ? parseInt(data.meta.trackId, 10) : undefined
		if (trackId == null || Number.isNaN(trackId)) return null

		let excerpt = data.excerpt ?? ''
		let exactMatch = false
		const transcriptPath = data.meta?.transcriptPath
		if (transcriptPath) {
			try {
				const res = await fetch(transcriptPath)
				if (res.ok) {
					const buffer = await res.arrayBuffer()
					const text = new TextDecoder('utf-8').decode(buffer)
					const { excerpt: customExcerpt, found } = extractExcerptAroundMatch(
						text,
						term,
						{ wordsBefore: 3, linesAfter: 3 },
					)
					if (found) {
						excerpt = highlightExcerpt(customExcerpt, term)
						exactMatch = true
					}
				}
			} catch {
				// Fall back to Pagefind excerpt
			}
		}

		return {
			id: result.id,
			excerpt,
			trackName: data.meta?.title ?? '',
			albumName: data.meta?.albumName ?? '',
			trackId,
			exactMatch,
		}
	}

	let loading = $state(true)
	let loadingMore = $state(false)
	let results = $state<DisplayItem[]>([])
	let totalCount = $state(0)
	let rawResults = $state<PagefindResult[]>([])
	let loadedRawCount = $state(0)
	let effectiveSearchTerm = $state('')
	let error = $state<string | null>(null)
	let sentinelEl: HTMLDivElement | null = $state(null)

	$effect(() => {
		const term = searchTerm.trim()
		if (!term) {
			loading = false
			results = []
			rawResults = []
			totalCount = 0
			loadedRawCount = 0
			effectiveSearchTerm = ''
			return
		}

		loading = true
		results = []
		rawResults = []
		totalCount = 0
		loadedRawCount = 0
		error = null

		const runSearch = async () => {
			if (typeof document === 'undefined') return
			try {
				const pagefindUrl = new URL('/pagefind/pagefind.js', document.baseURI).href
				const pagefind = await import(/* @vite-ignore */ pagefindUrl)
				await pagefind.options?.({ ranking: { termSimilarity: 2.5 } })
				pagefind.init?.()

				const searchTerms = romanToDevanagariForSearch(term)
				let search = null
				let effectiveTerm = term

				for (const q of searchTerms) {
					search = await pagefind.debouncedSearch(q, {}, 300)
					if (search !== null && (search.results?.length ?? 0) > 0) {
						effectiveTerm = q
						break
					}
				}
				if (search === null) return

				effectiveSearchTerm = effectiveTerm
				const raw = (search.results ?? []) as PagefindResult[]
				rawResults = raw
				totalCount = raw.length

				const batch = raw.slice(0, PAGE_SIZE)
				const loaded: DisplayItem[] = []
				for (const result of batch) {
					const item = await processResult(result, effectiveTerm)
					if (item) loaded.push(item)
				}
				loadedRawCount = batch.length
				results = loaded
			} catch (e) {
				error = e instanceof Error ? e.message : String(e)
			} finally {
				loading = false
			}
		}

		void runSearch()
	})

	async function loadMore() {
		if (loadingMore || loading || loadedRawCount >= rawResults.length) return
		loadingMore = true
		const term = effectiveSearchTerm || searchTerm.trim()
		const start = loadedRawCount
		const end = Math.min(start + PAGE_SIZE, rawResults.length)
		const batch = rawResults.slice(start, end)
		try {
			const loaded: DisplayItem[] = []
			for (const result of batch) {
				const item = await processResult(result, term)
				if (item) loaded.push(item)
			}
			loadedRawCount = end
			results = [...results, ...loaded]
		} finally {
			loadingMore = false
		}
	}

	$effect(() => {
		const el = sentinelEl
		if (!el) return
		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0]
				if (entry?.isIntersecting && !loading && !loadingMore && loadedRawCount < rawResults.length) {
					void loadMore()
				}
			},
			{ rootMargin: '200px', threshold: 0 },
		)
		observer.observe(el)
		return () => observer.disconnect()
	})

	const playTrack = (trackId: number) => {
		player.playTrack(0, [trackId])
	}
</script>

<div class="flex w-full flex-col gap-4 px-2 pb-8">
	{#if loading}
		<div class="flex flex-col items-center gap-2 py-8 text-onSurfaceVariant">
			<div class="size-8 animate-pulse rounded-full border-2 border-primary border-t-transparent"></div>
			<div class="text-body-md">{m.libraryTranscriptSearching()}</div>
		</div>
	{:else if error}
		<div class="py-8 text-center text-error">{error}</div>
	{:else if results.length === 0}
		<div class="flex flex-col items-center gap-2 py-8 text-center text-onSurfaceVariant">
			<Icon type="magnify" class="size-12 opacity-54" />
			<div class="text-body-lg">{m.libraryTranscriptSearchNoResults()}</div>
		</div>
	{:else}
		<div class="text-body-sm font-medium text-onSurfaceVariant">
			{m.libraryTranscriptSearchResultsCount({ count: totalCount })}
		</div>
		{#if results.length > 0 && !results[0].exactMatch}
			<div
				class="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-body-sm text-onSurfaceVariant"
			>
				{m.libraryTranscriptSearchTypeHindiHint()}
			</div>
		{/if}
		<ul class="flex flex-col gap-3" role="list">
			{#each results as item (item.id)}
				<li
					class="flex flex-col gap-2 rounded-lg border border-primary/10 bg-surfaceContainerHigh p-4"
				>
					<div
						class="line-clamp-5 min-h-[4.5rem] whitespace-pre-wrap text-body-md text-onSurface [&_mark]:bg-primary/20 [&_mark]:rounded [&_mark]:px-0.5"
						style="font-family: 'Noto Sans Devanagari', var(--font-sans)"
					>{@html item.excerpt}</div>
					<div class="flex items-center justify-between gap-2">
						<div class="min-w-0 flex-1 truncate">
							<div class="truncate font-medium text-onSurface">{item.trackName || m.unknown()}</div>
						</div>
						<Button kind="filled" class="!px-4" onclick={() => playTrack(item.trackId)}>
							<Icon type="play" />
							{m.play()}
						</Button>
					</div>
				</li>
			{/each}
		</ul>
		{#if loadedRawCount < rawResults.length}
			<div
				bind:this={sentinelEl}
				class="flex min-h-16 items-center justify-center py-4 text-onSurfaceVariant"
			>
				{#if loadingMore}
					<div class="flex items-center gap-2">
						<div class="size-5 animate-pulse rounded-full border-2 border-primary border-t-transparent"></div>
						<span class="text-body-sm">{m.libraryTranscriptSearchLoadingMore()}</span>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>
