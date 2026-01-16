export const setupAppInstallPromptListeners = () => {
	const main = useMainStore()

	// Check if app is already installed (running in standalone mode)
	const isStandalone = window.matchMedia('(display-mode: standalone)').matches
	const isIOSStandalone =
		'standalone' in navigator && (navigator as { standalone?: boolean }).standalone

	if (isStandalone || isIOSStandalone) {
		main.isAppInstalled = true
		return
	}

	main.isAppInstalled = false

	window.addEventListener('appinstalled', () => {
		main.appInstallPromptEvent = null
		main.isAppInstalled = true
	})

	window.addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault()
		main.appInstallPromptEvent = e
	})
}
