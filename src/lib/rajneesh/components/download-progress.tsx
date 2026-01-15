import { VoidComponent } from 'solid-js'
import type { DownloadProgress as DownloadProgressType } from '../cache/types'

export interface DownloadProgressDisplayProps {
  /** Download progress data */
  progress: DownloadProgressType
}

/**
 * Formats bytes to human-readable string
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Component to display detailed download progress
 */
export const DownloadProgressDisplay: VoidComponent<DownloadProgressDisplayProps> = (props) => {
  const getStatusText = () => {
    switch (props.progress.state) {
      case 'pending':
        return 'Queued...'
      case 'downloading':
        const { bytesLoaded, bytesTotal } = props.progress
        if (bytesTotal > 0) {
          return `${formatBytes(bytesLoaded)} / ${formatBytes(bytesTotal)}`
        }
        return `${formatBytes(bytesLoaded)}`
      case 'complete':
        return 'Downloaded'
      case 'error':
        return props.progress.error || 'Error'
      default:
        return ''
    }
  }

  return (
    <span title={getStatusText()}>
      {props.progress.state === 'downloading' && `${props.progress.progress}%`}
      {props.progress.state === 'pending' && 'Queued'}
      {props.progress.state === 'complete' && 'Downloaded'}
      {props.progress.state === 'error' && 'Error'}
    </span>
  )
}

/**
 * Get display text for download menu item
 */
export const getDownloadMenuText = (
  isCached: boolean,
  isDownloading: boolean,
  progress: number,
): string => {
  if (isCached) {
    return 'Downloaded'
  }
  if (isDownloading) {
    return `Downloading ${progress}%`
  }
  return 'Download'
}

/**
 * Check if download menu item should be disabled
 */
export const isDownloadMenuDisabled = (isCached: boolean): boolean => {
  return isCached
}
