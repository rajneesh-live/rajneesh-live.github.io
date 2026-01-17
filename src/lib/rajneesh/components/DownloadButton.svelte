<script lang="ts">
	import { ripple } from '$lib/attachments/ripple.ts'
	import { isRemoteFile, type FileEntity } from '$lib/helpers/file-system.ts'
	import { isUrlCached } from '../cache/audio-cache.ts'
	import { downloadTrack, getDownloadProgressState, initializeDownloadStore } from '../stores/download.svelte.ts'

	interface DownloadButtonProps {
		trackId: string
		file: FileEntity
		class?: string
	}

	const { trackId, file, class: className }: DownloadButtonProps = $props()

	// Initialize the download store
	initializeDownloadStore()

	// Reactive state for cache status
	let isCached = $state(false)

	// Derived state - directly access the reactive store
	const isRemote = $derived(isRemoteFile(file))
	const url = $derived(isRemote ? file.url : '')
	
	// Get progress from reactive state - this creates a proper reactive dependency
	const downloadProgress = $derived(getDownloadProgressState().get(trackId))
	const isDownloading = $derived(
		downloadProgress?.state === 'downloading' || downloadProgress?.state === 'queued'
	)
	const isComplete = $derived(downloadProgress?.state === 'complete')
	const progress = $derived(downloadProgress?.progress ?? 0)

	// Check cache status on mount, when trackId changes, or when download completes
	$effect(() => {
		if (isRemote) {
			// Re-check cache when download completes
			const _ = isComplete
			isUrlCached(file.url).then((cached) => {
				console.log(`[Rajneesh] Cache check for ${trackId}:`, cached)
				isCached = cached
			})
		}
	})

	const handleClick = (e: MouseEvent) => {
		e.stopPropagation()
		e.preventDefault()

		if (!isRemote || isCached || isDownloading) {
			console.log(`[Rajneesh] Download click blocked:`, { isRemote, isCached, isDownloading })
			return
		}

		console.log(`[Rajneesh] Starting download for ${trackId}`)
		downloadTrack(trackId, url)
	}
</script>

{#if isRemote}
	{#if isCached}
		<!-- Cached indicator -->
		<span
			class={[
				'flex w-14 shrink-0 items-center justify-center self-stretch text-green-500',
				className,
			]}
			title="Downloaded"
			onpointerdown={(e) => e.stopPropagation()}
			onclick={(e) => e.stopPropagation()}
		>
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="currentColor"
			>
				<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
			</svg>
		</span>
	{:else}
		<!-- Download button -->
		<button
			{@attach ripple({ stopPropagation: true })}
			class={[
				'relative flex w-14 shrink-0 items-center justify-center self-stretch overflow-hidden',
				'disabled:opacity-50',
				className,
			]}
			onclick={handleClick}
			disabled={isDownloading}
			title={isDownloading ? `Downloading ${progress}%` : 'Download for offline'}
		>
			{#if isDownloading}
				<!-- Progress indicator -->
				<div class="relative flex items-center justify-center">
					<svg
						class="size-5 animate-spin"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<circle cx="12" cy="12" r="10" class="opacity-25" />
						<path d="M12 2a10 10 0 0 1 10 10" class="opacity-75" />
					</svg>
					{#if progress > 0}
						<span class="absolute text-[8px] font-medium">{progress}</span>
					{/if}
				</div>
			{:else}
				<!-- Download icon -->
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="currentColor"
				>
					<path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
				</svg>
			{/if}
		</button>
	{/if}
{/if}
