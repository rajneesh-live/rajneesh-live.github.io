import { JSXElement } from 'solid-js'
import { usePlayerStore } from '../../../stores/stores'
import { IconButton } from '../../icon-button/icon-button'
import { Icon } from '../../icon/icon'
import * as styles from './controls.css'

export interface SeekBackButtonProps {
  simple?: boolean
}

export const SeekBackButton = (props: SeekBackButtonProps = {}): JSXElement => {
  const [playerState, playerActions] = usePlayerStore()

  const onSeekBackHandler = () => {
    const currentTime = playerState.currentTime
    const newTime = Math.max(0, currentTime - 10) // Seek back 10 seconds, but not below 0
    playerActions.changeCurrentTime(newTime)
  }

  if (props.simple) {
    return (
      <IconButton
        title='Seek back 10 seconds (← when timeline focused)'
        icon='seekBack'
        onClick={onSeekBackHandler}
        disabled={!playerState.activeTrack}
      />
    )
  }

  return (
    <button
      title='Seek back 10 seconds (← when timeline focused)'
      disabled={!playerState.activeTrack}
      onClick={onSeekBackHandler}
      class={styles.seekBackButton}
    >
      <Icon icon='seekBack' />
    </button>
  )
} 