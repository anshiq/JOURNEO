import { keyframes, style, styleVariants } from '@vanilla-extract/css'
import { vars } from '../theme/contract.css'
import { jx } from './root.css'

const tablet = `${jx} (min-width: 640px)`
const desktop = `${jx} (min-width: 1024px)`

const enter = keyframes({ from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } })

export const screen = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100%',
  animation: `${enter} 220ms ease-out`,
})

export const chrome = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
  padding: `${vars.space.sm} ${vars.space.md}`,
  minHeight: 48,
})

export const logo = styleVariants({
  sm: { height: 24, width: 'auto' },
  md: { height: 32, width: 'auto' },
  lg: { height: 44, width: 'auto' },
})

export const logoWrap = styleVariants({ left: { marginRight: 'auto' }, center: { margin: '0 auto' } })

export const back = style({
  minWidth: 44,
  minHeight: 44,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: vars.radius.button,
  color: vars.color.text,
  fontSize: '1.25em',
})

export const progress = style({ height: 4, width: '100%', background: vars.color.border, overflow: 'hidden' })
export const progressFill = style({ height: '100%', background: vars.color.primary, transition: 'width 300ms ease' })

export const body = style({ flex: '1 1 auto', display: 'flex', width: '100%' })

export const width = styleVariants({
  narrow: { maxWidth: 560 },
  normal: { maxWidth: 720 },
  wide: { maxWidth: 1040 },
})

export const content = style({
  width: '100%',
  margin: '0 auto',
  padding: `${vars.space.lg} ${vars.space.md} ${vars.space.xl}`,
  display: 'flex',
  flexDirection: 'column',
  '@container': { [tablet]: { padding: `${vars.space.xl} ${vars.space.lg}` } },
})

export const spacing = styleVariants({
  compact: { gap: vars.space.sm },
  comfortable: { gap: vars.space.md },
  spacious: { gap: vars.space.lg },
})

export const vAlign = styleVariants({ top: { justifyContent: 'flex-start' }, center: { justifyContent: 'center' } })
export const hAlign = styleVariants({
  left: { textAlign: 'left', alignItems: 'stretch' },
  center: { textAlign: 'center', alignItems: 'stretch' },
})

export const stack = style({ flexDirection: 'column' })

export const split = style({
  flexDirection: 'column',
  '@container': { [tablet]: { flexDirection: 'row', alignItems: 'stretch' } },
})

export const splitReverse = style({ '@container': { [tablet]: { flexDirection: 'row-reverse' } } })

export const splitPane = style({
  flex: '1 1 0',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
})

export const media = style({
  position: 'relative',
  width: '100%',
  minHeight: 220,
  maxHeight: '45vh',
  overflow: 'hidden',
  background: vars.color.surface,
  '@container': { [tablet]: { maxHeight: 'none', minHeight: 0 } },
})

export const mediaHiddenMobile = style({ display: 'none', '@container': { [tablet]: { display: 'block' } } })

export const mediaImage = style({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
})

export const cover = style({ position: 'relative', flexDirection: 'column', color: '#ffffff' })
export const coverMedia = style({ position: 'absolute', inset: 0, zIndex: -1, overflow: 'hidden' })
export const coverShade = style({ position: 'absolute', inset: 0 })
export const coverContent = style({ position: 'relative', flex: '1 1 auto', display: 'flex', minHeight: '70vh' })

export const mobileBackground = style({
  '@container': { [`${jx} (max-width: 639px)`]: { color: '#ffffff' } },
})

export const sticky = style({
  position: 'sticky',
  bottom: 0,
  zIndex: 2,
  margin: `0 calc(-1 * ${vars.space.md})`,
  padding: `${vars.space.sm} ${vars.space.md} calc(${vars.space.sm} + env(safe-area-inset-bottom))`,
  background: vars.color.background,
  boxShadow: `0 -8px 16px -12px ${vars.color.border}`,
  '@container': {
    [tablet]: { position: 'static', margin: 0, padding: 0, boxShadow: 'none', background: 'transparent' },
  },
})

export const endCard = style({ textAlign: 'center', alignItems: 'center' })

export const desktopOnly = style({ '@container': { [desktop]: {} } })
