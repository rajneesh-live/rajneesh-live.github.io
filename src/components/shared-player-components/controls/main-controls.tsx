import { VoidComponent } from 'solid-js'
import { PlayPauseButton } from './play-pause-button'
import { SeekBackButton } from './seek-back-button'
import { clx } from '../../../utils'
import * as styles from './controls.css'

export interface ControlsProps {
  simple?: boolean
  class?: string | false
}

export const Controls: VoidComponent<ControlsProps> = (props) => {
  return (
    <div class={clx(styles.controls, props.class)}>
      <SeekBackButton simple={props.simple} />
      <PlayPauseButton simple={props.simple} />
    </div>
  )
}
