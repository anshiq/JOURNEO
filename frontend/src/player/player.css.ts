import { globalStyle, style } from '@vanilla-extract/css'

globalStyle('html, body', { margin: 0, minHeight: '100%', height: '100%' })
globalStyle('#jx-player', { minHeight: '100dvh', display: 'flex' })

export const shell = style({ minHeight: '100dvh', display: 'flex', flexDirection: 'column' })

export const center = style({
  flex: '1 1 auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  padding: 24,
  minHeight: '100dvh',
  textAlign: 'center',
})

export const banner = style({
  position: 'sticky',
  top: 0,
  zIndex: 20,
  width: '100%',
  padding: '10px 16px',
  background: '#111827',
  color: '#ffffff',
  fontSize: 14,
  textAlign: 'center',
  border: 0,
  cursor: 'pointer',
})
