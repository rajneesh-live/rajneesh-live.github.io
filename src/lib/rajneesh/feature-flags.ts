/**
 * Feature flags for Rajneesh-specific functionality.
 * These flags control which features are enabled at runtime,
 * allowing upstream behavior to be preserved when flags are disabled.
 */
export const RAJNEESH_FLAGS = {
  /** P0: Load bundled YAML catalog at startup */
  STATIC_CATALOG: true,

  /** P1: IndexedDB caching for audio files */
  AUDIO_CACHING: true,

  /** P2: Per-track download status UI */
  DOWNLOAD_UI: true,

  /** Deferred: History tab showing listening progress */
  HISTORY_TAB: false,

  /** Deferred: Simplified player controls (no shuffle/repeat/prev/next) */
  SIMPLIFIED_CONTROLS: false,

  /** Deferred: Fuzzy search across track metadata */
  FUZZY_SEARCH: false,
} as const

export type RajneeshFlags = typeof RAJNEESH_FLAGS
