import { style } from '@vanilla-extract/css'
import { trailingSizeVar } from '~/components/list-item/list-item.css'
import { sprinkles, sharedStyles } from '../../../styles/styles.css'

export const container = style({
  width: '100%',
})

const smallWidthMedia = '(max-width: 440px)'
const extraSmallWidthMedia = '(max-width: 256px)'

export const compact = style({
  vars: {
    [trailingSizeVar]: '80px', // Increased to accommodate progress/duration text
  },
})

export const narrow = style({
  vars: {
    [trailingSizeVar]: '70px', // Ensure minimum space for time display
  },
})

export const small = style({})

export const extraSmall = style({})

export const firstColumn = style([
  sprinkles({
    typography: 'bodyLarge',
  }),
  style({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '24px',
  }),
])

export const artwork = style({
  height: '40px',
  width: '40px',
  contain: 'strict',
  '@media': {
    [extraSmallWidthMedia]: {
      display: 'none',
    },
  },
})

export const album = style([
  sharedStyles.textEclipse,
  style({
    flexShrink: 1, // Allow album to shrink before time
    minWidth: 0, // Allow it to shrink below content size
    selectors: {
      [`${compact} &`]: {
        display: 'none', // Hide album in compact mode to give space to time
      },
      [`${narrow} &`]: {
        display: 'none', // Hide album in narrow mode to prioritize time display
      },
    },
  }),
])

export const time = style([
  style({
    marginLeft: 'auto',
    flexShrink: 0,
    whiteSpace: 'nowrap', // Prevent text wrapping
    overflow: 'visible', // Ensure text is not cut off
    fontSize: '0.875rem', // Slightly smaller font on narrow screens
    '@media': {
      [smallWidthMedia]: {
        fontSize: '0.8rem', // Even smaller font for very small screens
      },
    },
  }),
])
