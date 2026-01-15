import { PluginOption } from 'vite'

export interface Options {
  input: string[]
}

export const injectScriptsToHtmlDuringBuild = (
  pluginOptions: Options,
): PluginOption => {
  let inputFileRefs: string[] = []
  let inputFileNames: string[] = []

  return {
    enforce: 'pre',
    apply: 'build',
    name: 'inject-script-to-html-during-build',
    buildStart() {
      inputFileRefs = pluginOptions.input.map((file) =>
        this.emitFile({ type: 'chunk', id: file }),
      )
    },
    generateBundle() {
      inputFileNames = inputFileRefs.map((id) => this.getFileName(id))
    },
    transformIndexHtml: {
      enforce: 'post',
      transform(html, ctx) {
        // Get the base path from Vite config
        const base = ctx.server?.config.base || '/'
        const normalizedBase = base === '/' ? '' : base.replace(/\/$/, '')
        
        return inputFileNames.map((src) => ({
          tag: 'script',
          attrs: {
            src: `${normalizedBase}/${src}`,
            type: 'module',
            async: true,
          },
          injectTo: 'head',
        }))
      },
    },
  }
}
