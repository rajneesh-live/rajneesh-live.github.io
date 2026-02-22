// Module-level state — survives component remounts during in-app navigation
export let lastShortsIndex = 0
export let savedPlaybackTime: number | null = null

export function setLastShortsIndex(index: number) {
	lastShortsIndex = index
}

export function setSavedPlaybackTime(time: number | null) {
	savedPlaybackTime = time
}

