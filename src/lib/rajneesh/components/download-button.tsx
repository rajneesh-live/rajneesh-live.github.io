import { VoidComponent, Show } from 'solid-js'
import { clx } from '~/utils'
import * as styles from './download-button.css'

export interface DownloadButtonProps {
  /** Whether the track is cached */
  isCached: boolean
  /** Whether download is in progress */
  isDownloading: boolean
  /** Download progress percentage (0-100) */
  progress: number
  /** Click handler for download action */
  onDownload: () => void
  /** Whether to use compact styling */
  compact?: boolean
  /** Additional class name */
  class?: string
}

/**
 * Download button component showing download status and progress.
 * 
 * States:
 * - Not cached: Shows "Download" button
 * - Downloading: Shows "X%" progress
 * - Cached: Shows checkmark badge
 */
export const DownloadButton: VoidComponent<DownloadButtonProps> = (props) => {
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation()
    if (!props.isCached && !props.isDownloading) {
      props.onDownload()
    }
  }

  return (
    <Show
      when={!props.isCached}
      fallback={
        <span class={styles.cachedBadge}>
          <svg class={styles.checkIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        </span>
      }
    >
      <button
        class={clx(
          styles.downloadButton,
          props.compact && styles.downloadButtonCompact,
          props.class,
        )}
        onClick={handleClick}
        disabled={props.isDownloading}
        title={props.isDownloading ? `Downloading ${props.progress}%` : 'Download for offline'}
      >
        <Show
          when={props.isDownloading}
          fallback={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
          }
        >
          <svg
            class={styles.spinnerIcon}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" opacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          <span class={styles.progressText}>{props.progress}%</span>
        </Show>
      </button>
    </Show>
  )
}
