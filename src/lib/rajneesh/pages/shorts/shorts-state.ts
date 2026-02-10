// Module-level state — survives component remounts during in-app navigation
export let lastShortsIndex = 0

export function setLastShortsIndex(index: number) {
	lastShortsIndex = index
}
