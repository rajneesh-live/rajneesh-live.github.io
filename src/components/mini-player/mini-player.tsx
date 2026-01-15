import { useNavigate } from 'solid-app-router'
import { Show, VoidComponent } from 'solid-js'
import { createMediaQuery } from '~/helpers/hooks/create-media-query'
import { Artwork } from '../shared-player-components/artwork/artwork'
import { Controls } from '../shared-player-components/controls/main-controls'
import { PlayPauseButton } from '../shared-player-components/controls/play-pause-button'
import { SeekBackButton } from '../shared-player-components/controls/seek-back-button'
import { VolumePanel } from '../shared-player-components/volume/volume-panel'
import { Info } from '../shared-player-components/info/info'
import { Timeline } from '../shared-player-components/timeline/timeline'
import { clx } from '~/utils'
import { Icon } from '../icon/icon'
import * as styles from './mini-player.css'

export interface MiniPlayerProps {
  class?: string | false
}

export const MiniPlayer: VoidComponent<MiniPlayerProps> = (props) => {
  const areMainControlsHidden = createMediaQuery(styles.COMPACT_MEDIA)

  const navigate = useNavigate()

  return (
    <div class={clx(styles.container, props.class)}>
      {!areMainControlsHidden() && <Timeline />}

      <div class={styles.infoSection}>
        <button
          title='Open player'
          class={styles.openFullPlayerButton}
          onClick={() => navigate('/player')}
        >
          <div class={styles.artworkContainer}>
            <Icon icon='chevronUp' class={styles.artworkArrow} />
            <Artwork />
          </div>
          <Info />
        </button>
      </div>
      <Show
        when={!areMainControlsHidden()}
        fallback={
          <div class={styles.compactControls}>
            <SeekBackButton simple />
            <PlayPauseButton simple />
          </div>
        }
      >
        <Controls simple class={styles.miniPlayerControls} />
        <VolumePanel />
      </Show>
    </div>
  )
}
