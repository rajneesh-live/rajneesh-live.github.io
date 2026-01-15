import { JSXElement } from 'solid-js'
import { clx } from '../../../utils'
import { usePlayerStore } from '../../../stores/stores'
import { IconButton } from '../../icon-button/icon-button'
import * as styles from './controls.css'

export interface PlayPauseButtonProps {
  simple?: boolean
}

export const PlayPauseButton = (props: PlayPauseButtonProps = {}): JSXElement => {
  const [playerState, playerActions] = usePlayerStore()

  if (props.simple) {
    return (
      <IconButton
        title={playerState.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        icon={playerState.isPlaying ? 'pause' : 'play'}
        onClick={() => playerActions.playPause()}
        disabled={!playerState.activeTrack}
      />
    )
  }

  return (
    <button
      title={playerState.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
      disabled={!playerState.activeTrack}
      onClick={() => playerActions.playPause()}
      class={styles.playPauseButton}
    >
      <div
        class={clx(
          styles.playPauseIcon,
          playerState.isPlaying && styles.playing,
        )}
      >
        <div class={styles.playPauseIconBar} />
        <div class={clx(styles.playPauseIconBar, styles.flippedY)} />
      </div>
    </button>
  )
}
