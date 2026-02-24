import { browser } from '$app/environment'
import posthog from 'posthog-js'

const POSTHOG_API_KEY = 'phc_UV64HQ0zEhktp0y5NHWBPoY97oLwEwz19Ur0rRJ3dz0'
const POSTHOG_HOST = 'https://app.posthog.com'

let initialized = false

export const initPosthog = () => {
	if (!browser || initialized) {
		return
	}

	if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
		return
	}

	if (!POSTHOG_API_KEY) {
		return
	}

	posthog.init(POSTHOG_API_KEY, {
		api_host: POSTHOG_HOST,
		autocapture: true,
		capture_pageview: false,
		capture_pageleave: true,
		disable_session_recording: false,
		loaded: (client) => {
			if (import.meta.env.DEV) {
				client.debug(true)
			}
		},
	})

	initialized = true
}

export const trackPageview = (url?: string) => {
	if (!browser) {
		return
	}

	if (!initialized) {
		initPosthog()
	}

	if (!initialized) {
		return
	}

	posthog.capture('$pageview', {
		$current_url: url ?? window.location.href,
		$pathname: window.location.pathname,
	})
}

type ListenedMinutePayload = {
	activeMinuteTimestampMs: number
	trackId: string
	trackTimestampMs: number
	playbackRate: number
}

export const trackListenedMinute = (payload: ListenedMinutePayload) => {
	if (!browser) {
		return
	}

	if (!initialized) {
		initPosthog()
	}

	if (!initialized) {
		return
	}

	posthog.capture('listened_minute', {
		...payload,
	})
}

type ShortLikedPayload = {
	trackId: string
}

export const trackShortLiked = (payload: ShortLikedPayload) => {
	if (!browser) {
		return
	}

	if (!initialized) {
		initPosthog()
	}

	if (!initialized) {
		return
	}

	posthog.capture('short_liked', {
		...payload,
	})
}
