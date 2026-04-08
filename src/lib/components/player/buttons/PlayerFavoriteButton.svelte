<script lang="ts">
	import { tick } from 'svelte'
	import CommonDialog from '$lib/components/dialog/CommonDialog.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import { findTranscriptPath } from '$lib/rajneesh/transcript/candidates.ts'
	import { highlightExcerpt } from '$lib/rajneesh/transcript/excerpt.ts'

	const player = usePlayer()

	const track = $derived(player.activeTrack)

	let dialogOpen = $state(false)
	let loading = $state(false)
	let error = $state<string | null>(null)
	let transcriptHtml = $state('')
	let transcriptContentEl: HTMLDivElement | null = $state(null)
	let transcriptPath = $state<string | null>(null)
	let transcriptLookupId = 0

	const openTranscript = async () => {
		if (!track || !transcriptPath) {
			return
		}

		dialogOpen = true
		loading = true
		error = null
		transcriptHtml = ''

		try {
			const response = await fetch(transcriptPath)
			if (!response.ok) {
				throw new Error('Transcript unavailable for this discourse.')
			}

			const buffer = await response.arrayBuffer()
			const transcriptText = new TextDecoder('utf-8').decode(buffer)
			transcriptHtml = highlightExcerpt(transcriptText, '')
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load transcript.'
		} finally {
			loading = false
		}
	}

	const closeTranscript = () => {
		dialogOpen = false
		loading = false
		error = null
		transcriptHtml = ''
		transcriptContentEl = null
	}

	$effect(() => {
		const activeTrack = track
		transcriptPath = null

		if (!activeTrack) {
			return
		}

		const lookupId = ++transcriptLookupId

		void (async () => {
			const resolvedPath = await findTranscriptPath(activeTrack.uuid)

			if (lookupId !== transcriptLookupId || track?.uuid !== activeTrack.uuid) {
				return
			}

			transcriptPath = resolvedPath
		})()
	})

	$effect(() => {
		const contentEl = transcriptContentEl
		if (!dialogOpen || loading || error || !transcriptHtml || !contentEl) {
			return
		}

		void tick().then(() => {
			contentEl.scrollTop = 0
		})
	})
</script>

{#if transcriptPath}
	<IconButton
		tooltip="Read transcript"
		onclick={() => void openTranscript()}
		icon="fileDocumentOutline"
	/>
{/if}

<CommonDialog
	open={{
		get: () => dialogOpen,
		close: closeTranscript,
	}}
	title={track?.name || 'Transcript'}
	showCloseButton
	class="max-w-4xl [--dialog-height:calc(100dvh-1rem)] [--dialog-width:calc(100dvw-1rem)] sm:[--dialog-height:calc(100dvh-3rem)] sm:[--dialog-width:--spacing(180)]"
	buttons={[{ title: 'Close' }]}
>
	{#snippet topRight()}
		<IconButton
			icon="play"
			tooltip="Play this discourse"
			class="size-10 bg-surfaceContainer sm:size-11"
			disabled={!track}
			onclick={() => track && player.togglePlay(true)}
		/>
	{/snippet}

	{#snippet children()}
		<div class="flex min-h-0 flex-col gap-3">
			{#if track?.album}
				<div class="text-body-sm text-onSurfaceVariant sm:pr-14">{track.album}</div>
			{/if}

			{#if loading}
				<div class="flex items-center gap-2 py-4 text-onSurfaceVariant">
					<div
						class="size-5 animate-pulse rounded-full border-2 border-primary border-t-transparent"
					></div>
					<span class="text-body-sm">Loading transcript...</span>
				</div>
			{:else if error}
				<div class="py-2 text-body-md text-error">{error}</div>
			{:else}
				<div
					bind:this={transcriptContentEl}
					class="max-h-[64dvh] overflow-y-auto pr-1 text-body-md whitespace-pre-wrap text-onSurface select-text sm:max-h-[70dvh] sm:pr-2 [&_mark]:rounded [&_mark]:bg-primary/20 [&_mark]:px-0.5"
					style="font-family: 'Noto Sans Devanagari', var(--font-sans)"
				>
					{@html transcriptHtml}
				</div>
			{/if}
		</div>
	{/snippet}
</CommonDialog>
