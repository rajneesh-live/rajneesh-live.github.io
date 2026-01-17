import '../app.css'
import { browser } from '$app/environment'
import { snackbar } from '$lib/components/snackbar/snackbar'
import { registerServiceWorker } from '$lib/helpers/register-sw'
import { initializeRajneesh } from '$lib/rajneesh/init.ts'
import { baseLocale, isLocale, overwriteGetLocale, overwriteSetLocale } from '$paraglide/runtime'
import type { LayoutLoad } from './$types.d.ts'

export const ssr = false
export const prerender = false

const initLocale = () => {
	const savedLocale = localStorage.getItem('snae-locale')
	const locale = isLocale(savedLocale) ? savedLocale : baseLocale

	document.documentElement.lang = locale

	return locale
}

if (browser) {
	const locale = initLocale()
	overwriteGetLocale(() => locale)
	overwriteSetLocale((locale) => {
		localStorage.setItem('snae-locale', locale)
		window.location.reload()
	})

	registerServiceWorker({
		onNeedRefresh(update) {
			snackbar({
				id: 'app-update',
				message: m.appUpdateAvailable(),
				duration: false,
				controls: {
					label: m.reload(),
					action: update,
				},
			})
		},
	})
}

export const load: LayoutLoad = async () => {
	if (browser) {
		await initializeRajneesh()
	}
}
