<script lang="ts">
	import Artwork from '$lib/components/Artwork.svelte'
	import Button from '$lib/components/Button.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import { getDatabase } from '$lib/db/database.ts'
	import { createQuery } from '$lib/db/query/query.ts'
	import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'
	import { formatNameOrUnknown } from '$lib/helpers/utils/text.ts'
	import { dbGetAlbumTracksIdsByName, getLibraryItemIdFromUuid } from '$lib/library/get/ids.ts'
	import { getLibraryValue, type TrackData } from '$lib/library/get/value.ts'
	import type { Album } from '$lib/library/types.ts'

	const player = usePlayer()

	type ResumeCardData = {
		track: TrackData
		album: Album | undefined
		albumTrackIds: number[]
		trackId: number
	}

	const latestResumeQuery = createQuery({
		key: [],
		fetcher: async (): Promise<ResumeCardData | null> => {
			const db = await getDatabase()
			const tx = db.transaction('activeMinutes')
			const index = tx.store.index('activeMinuteTimestampMs')
			const cursor = await index.openCursor(null, 'prev')
			const latest = cursor?.value

			if (!latest) {
				return null
			}

			const trackId = await getLibraryItemIdFromUuid('tracks', latest.trackId)
			if (!trackId) {
				return null
			}

			const track = await getLibraryValue('tracks', trackId, true)
			if (!track) {
				return null
			}

			const [album, albumTrackIds] = await Promise.all([
				db.getFromIndex('albums', 'name', track.album),
				dbGetAlbumTracksIdsByName(track.album),
			])

			return { track, album, albumTrackIds, trackId }
		},
		onDatabaseChange: (changes, { refetch }) => {
			for (const change of changes) {
				if (
					change.storeName === 'activeMinutes' ||
					change.storeName === 'tracks' ||
					change.storeName === 'albums'
				) {
					void refetch()
					break
				}
			}
		},
	})

	const resumeData = $derived(latestResumeQuery.value)

	const artworkSrc = createManagedArtwork(() => resumeData?.album?.image ?? resumeData?.track?.image?.small)

	const resume = () => {
		if (!resumeData) {
			return
		}

		const { albumTrackIds, trackId } = resumeData
		if (albumTrackIds.length > 0) {
			const startIndex = albumTrackIds.indexOf(trackId)
			if (startIndex >= 0) {
				player.playTrack(startIndex, albumTrackIds)
				return
			}
		}

		player.playTrack(0, [trackId])
	}
</script>

{#if resumeData}
	<div class="flex grow flex-col px-4 pb-4">
		<section
			class="relative flex w-full flex-col items-center justify-center gap-6 overflow-clip py-4 @2xl:min-h-60 @2xl:flex-row"
		>
			<Artwork
				src={artworkSrc()}
				fallbackIcon="album"
				alt={resumeData.track.name}
				class="h-49 shrink-0 rounded-2xl @2xl:h-full"
			/>

			<div class="relative z-0 flex h-full w-full flex-col overflow-clip rounded-2xl bg-surfaceContainerHigh">
				<div class="flex grow flex-col p-4">
					<div class="text-headline-md">{formatNameOrUnknown(resumeData.track.name)}</div>
					<div class="mt-1 text-body-lg text-onSurfaceVariant">
						{formatNameOrUnknown(resumeData.track.album)}
					</div>
				</div>

				<div class="mt-auto flex items-center gap-2 py-4 pr-2 pl-4">
					<Button kind="filled" class="my-1" onclick={resume}>Resume</Button>

					<IconButton
						class="ml-auto"
						icon="moreVertical"
						tooltip={m.more()}
						disabled
					/>
				</div>
			</div>
		</section>
	</div>
{:else}
	<div class="flex h-full flex-col items-center justify-center gap-4 text-center">
		<Icon type="home" class="size-24 opacity-20" />
		<h1 class="text-headline-lg font-bold">Welcome</h1>
	</div>
{/if}
