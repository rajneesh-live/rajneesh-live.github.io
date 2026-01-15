import { createMemo, VoidComponent } from 'solid-js'
import { useEntitiesStore, usePlayerStore } from '../../../stores/stores'
import { TracksList } from '../tracks-list/tracks-list'
import { formatTime } from '../../../utils'
import { MessageBanner } from '../../message-banner/message-banner'

export interface HistoryListProps {
  items: readonly string[]
}

export const HistoryList: VoidComponent<HistoryListProps> = (props) => {
  const [entities] = useEntitiesStore()
  const [playerState, playerActions] = usePlayerStore()

  // Filter tracks that have saved progress and sort by most recently played
  const historyItems = createMemo(() => {
    const { activeMinutes, currentActiveMinute } = playerState
    const { tracks } = entities

    // Get all active minutes (persisted + current in-memory)
    const allActiveMinutes = [...activeMinutes]
    if (currentActiveMinute) {
      allActiveMinutes.push(currentActiveMinute)
    }

    // Group by track ID and find the most recent for each track
    const trackProgressMap = new Map<string, { timestamp: number, activeminute_timestamp: number }>()
    
    allActiveMinutes.forEach(activeMinute => {
      const trackId = activeMinute.track_id
      const existing = trackProgressMap.get(trackId)
      
      if (!existing || activeMinute.activeminute_timestamp_ms > existing.activeminute_timestamp) {
        trackProgressMap.set(trackId, {
          timestamp: activeMinute.track_timestamp_ms,
          activeminute_timestamp: activeMinute.activeminute_timestamp_ms
        })
      }
    })

    // Filter tracks that exist and have meaningful progress
    const tracksWithProgress = Array.from(trackProgressMap.entries())
      .filter(([trackId, progress]) => tracks[trackId] && progress.timestamp > 5000) // 5 seconds in ms
      .map(([trackId, progress]) => ({
        id: trackId,
        timestamp: progress.timestamp,
        activeminute_timestamp: progress.activeminute_timestamp,
        track: tracks[trackId]
      }))
      .sort((a, b) => b.activeminute_timestamp - a.activeminute_timestamp) // Sort by most recent active minute

    return tracksWithProgress.map(item => item.id)
  })

  const getProgressText = (trackId: string) => {
    const { activeMinutes, currentActiveMinute } = playerState
    const track = entities.tracks[trackId]
    
    if (!track) return ''
    
    // Get all active minutes for this track (persisted + current in-memory)
    const allActiveMinutes = [...activeMinutes]
    if (currentActiveMinute && currentActiveMinute.track_id === trackId) {
      allActiveMinutes.push(currentActiveMinute)
    }
    
    const trackActiveMinutes = allActiveMinutes
      .filter(am => am.track_id === trackId)
      .sort((a, b) => b.activeminute_timestamp_ms - a.activeminute_timestamp_ms)
    
    if (trackActiveMinutes.length === 0) return ''
    
    const timestamp = trackActiveMinutes[0].track_timestamp_ms / 1000 // Convert to seconds
    const progress = (timestamp / track.duration) * 100
    const timeRemaining = track.duration - timestamp
    
    return `${Math.round(progress)}% • ${formatTime(timeRemaining)} left`
  }

  const additionalMenuItems = (track: any) => [
    {
      name: 'Clear progress',
      action: () => {
        playerActions.clearTrackTimestamp(track.id)
      }
    }
  ]

  return (
    <TracksList
      items={historyItems()}
      additionalMenuItems={additionalMenuItems}
      fallback={
        <MessageBanner
          title='No listening history'
          message='Tracks you listen to will appear here with your progress.'
        />
      }
    />
  )
} 