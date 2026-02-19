export interface BgMusicItem {
	id: string
	title: string
	url: string | null
}

export const BG_MUSIC_OPTIONS: BgMusicItem[] = [
	{ id: 'none', title: 'None', url: null },
	{ id: 'interstellar', title: 'Interstellar', url: '/audio/interstellar.mp3' },
]

const STORAGE_KEY = 'shorts-bg-music'
const VOLUME_KEY = 'shorts-bg-music-volume'
const DEFAULT_VOLUME = 0.15

export function getSelectedBgMusic(): string {
	return localStorage.getItem(STORAGE_KEY) ?? 'none'
}

export function setSelectedBgMusic(id: string): void {
	if (id === 'none') {
		localStorage.removeItem(STORAGE_KEY)
	} else {
		localStorage.setItem(STORAGE_KEY, id)
	}
}

export function getBgMusicVolume(): number {
	const raw = localStorage.getItem(VOLUME_KEY)
	if (raw) {
		const v = parseFloat(raw)
		if (!isNaN(v)) return Math.max(0, Math.min(1, v))
	}
	return DEFAULT_VOLUME
}

export function setBgMusicVolume(volume: number): void {
	localStorage.setItem(VOLUME_KEY, String(volume))
}
