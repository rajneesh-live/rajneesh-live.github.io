import type { BookmarkItem } from './bookmark-items.ts'
import type { PlayerStore } from '$lib/stores/player/player.svelte.ts'

export const playBookmark = (player: PlayerStore, item: BookmarkItem): void => {
	player.playTrackAtTime(0, item.bookmark.timestampSeconds, [item.trackId])
}
