import { style, keyframes } from '@vanilla-extract/css'
import { sprinkles } from '~/styles/styles.css'

export const downloadButton = style([
  sprinkles({
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    borderRadius: '4px',
  }),
  {
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    backgroundColor: 'transparent',
    color: 'inherit',
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    ':disabled': {
      cursor: 'default',
      opacity: 0.7,
    },
  },
])

export const downloadButtonCompact = style({
  padding: '2px 6px',
  fontSize: '11px',
})

export const progressText = style({
  minWidth: '32px',
  textAlign: 'right',
})

const spin = keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(360deg)' },
})

export const spinnerIcon = style({
  animation: `${spin} 1s linear infinite`,
})

export const cachedBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '2px',
  fontSize: '11px',
  color: 'rgba(255, 255, 255, 0.6)',
  marginRight: '4px',
})

export const checkIcon = style({
  width: '12px',
  height: '12px',
  color: 'rgba(100, 200, 100, 0.8)',
})
