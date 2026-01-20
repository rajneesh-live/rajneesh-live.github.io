/** @import { Config } from '@sveltejs/kit' */
import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {Config} */
const config = {
	preprocess: vitePreprocess(),
	compilerOptions: {
		runes: true,
		experimental: {
			async: true,
		},
	},
	kit: {
		paths: {
			relative: false,
		},
		outDir: './.generated/svelte-kit',
		adapter: adapter({
			// GitHub Pages serves 404.html for unknown routes (SPA fallback)
			fallback: '404.html',
		}),
		alias: {
			$paraglide: './.generated/paraglide',
		},
		csp: {
			directives: {
				'default-src': ['none'],
				'script-src': [
					'self',
					'https://gc.zgo.at/',
					'https://us-assets.i.posthog.com/',
				],
				'style-src': ['self', 'unsafe-inline'],
				// Allow remote images/audio (e.g. archive.org) to be displayed/played
				'img-src': ['self', 'blob:', 'data:', 'https:', 'http:'],
				'media-src': ['self', 'blob:', 'data:', 'https:', 'http:'],
				'font-src': ['self', 'data:', 'https:', 'http:'],
				// Required for `fetch()` downloads / metadata checks against remote origins
				'connect-src': ['self', 'blob:', 'data:', 'https:', 'http:'],
				'form-action': ['none'],
				'manifest-src': ['self'],
				'base-uri': ['none'],
			},
		},
		typescript: {
			config: (tsConfig) => {
				tsConfig.extends = '../../tsconfig.base.json'
				tsConfig.include.push('../paraglide/**/*')

				return tsConfig
			},
		},
		serviceWorker: {
			register: false,
		},
	},
}

export default config
