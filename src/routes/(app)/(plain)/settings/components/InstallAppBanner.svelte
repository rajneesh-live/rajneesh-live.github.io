<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import { isMobile } from '$lib/helpers/utils/ua.ts'

	interface Props {
		class: ClassValue
	}

	const { class: className }: Props = $props()

	const main = useMainStore()
	const isHandHeldDevice = isMobile()

	const install = async (e: BeforeInstallPromptEvent) => {
		await e.prompt()

		window.goatcounter?.count({
			path: 'click-settings-install-app',
			title: 'Clicked settings install app',
			event: true,
		})
	}

	const installEvent = $derived(main.appInstallPromptEvent)
	const isInstalled = $derived(main.isAppInstalled)

	// Determine the current state
	type InstallState = 'installable' | 'installed' | 'unavailable'
	const installState = $derived<InstallState>(() => {
		if (isInstalled) return 'installed'
		if (installEvent) return 'installable'
		return 'unavailable'
	})

	const onInstallClick = () => {
		if (installEvent) {
			install(installEvent)
		}
	}

	const subtitle = $derived(() => {
		const state = installState()
		switch (state) {
			case 'installed':
				return m.settingsInstallAppAlreadyInstalled()
			case 'unavailable':
				return m.settingsInstallAppUnavailable()
			case 'installable':
			default:
				return m.settingsInstallAppExplanation({
					device: isHandHeldDevice ? m.settingsInstallAppHomeScreen() : m.settingsInstallAppDesktop(),
				})
		}
	})

	const isButtonDisabled = $derived(installState() !== 'installable')
</script>

<section
	class={[
		'card mx-auto w-full gap-2 bg-primary/12 p-4',
		className,
	]}
>
	<div class="text-title-md font-medium">{m.settingsInstallAppTitle()}</div>
	<div class="flex w-full flex-col items-center justify-between gap-3 sm:flex-row">
		<div class="text-body-md text-on-surface-variant">
			{subtitle()}
		</div>

		{#if installState() !== 'installed'}
			<Button 
				class="w-full shrink-0 sm:w-35" 
				onclick={onInstallClick}
				disabled={isButtonDisabled}
			>
				{m.settingsInstallAppHomeAction()}
			</Button>
		{/if}
	</div>
</section>
