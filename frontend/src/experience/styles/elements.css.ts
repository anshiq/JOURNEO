import { globalStyle, keyframes, style, styleVariants } from '@vanilla-extract/css'
import { vars } from '../theme/contract.css'
import { jx } from './root.css'

const tablet = `${jx} (min-width: 640px)`
const desktop = `${jx} (min-width: 1024px)`

export const element = style({ minWidth: 0 })
export const ghost = style({ opacity: 0.35, outline: `1px dashed ${vars.color.muted}` })

export const spaceBefore = styleVariants({
  none: {},
  sm: { marginTop: vars.space.sm },
  md: { marginTop: vars.space.md },
  lg: { marginTop: vars.space.lg },
  xl: { marginTop: vars.space.xl },
})
export const spaceAfter = styleVariants({
  none: {},
  sm: { marginBottom: vars.space.sm },
  md: { marginBottom: vars.space.md },
  lg: { marginBottom: vars.space.lg },
  xl: { marginBottom: vars.space.xl },
})
export const align = styleVariants({
  left: { textAlign: 'left' },
  center: { textAlign: 'center' },
  right: { textAlign: 'right' },
})
export const emphasis = styleVariants({ normal: {}, strong: { fontWeight: 700 }, subtle: { opacity: 0.75 } })
export const elementWidth = styleVariants({
  auto: {},
  full: { width: '100%' },
  narrow: { maxWidth: 360, marginInline: 'auto', width: '100%' },
  normal: { maxWidth: 560, marginInline: 'auto', width: '100%' },
  wide: { width: '100%' },
})

export const headingSize = styleVariants({
  h1: { fontSize: `clamp(1.75rem, 5.5cqi + 0.5rem, 3.25rem)` },
  h2: { fontSize: `clamp(1.375rem, 3.5cqi + 0.5rem, 2.25rem)` },
  h3: { fontSize: `clamp(1.125rem, 2cqi + 0.6rem, 1.5rem)` },
})

export const sizeScale = styleVariants({
  xs: { fontSize: '0.8em' },
  sm: { fontSize: '0.9em' },
  md: {},
  lg: { fontSize: '1.15em' },
  xl: { fontSize: '1.35em' },
})

export const textPreset = styleVariants({
  body: {},
  lead: { fontSize: '1.15em', color: vars.color.text, opacity: 0.85 },
  caption: { fontSize: '0.85em', color: vars.color.muted },
  quote: {
    fontSize: '1.1em',
    fontStyle: 'italic',
    borderLeft: `3px solid ${vars.color.primary}`,
    paddingLeft: vars.space.md,
  },
  eyebrow: {
    fontSize: '0.8em',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: vars.color.primary,
  },
  notice: {
    fontSize: '0.92em',
    background: vars.color.surface,
    border: `1px solid ${vars.color.border}`,
    borderRadius: vars.radius.card,
    padding: `${vars.space.sm} ${vars.space.md}`,
  },
})

export const richText = style({ display: 'flex', flexDirection: 'column', gap: '0.6em' })
export const checkList = style({ listStyle: 'none', paddingLeft: 0 })
globalStyle(`${checkList} > li`, { position: 'relative', paddingLeft: '1.6em' })
globalStyle(`${checkList} > li::before`, {
  content: '"✓"',
  position: 'absolute',
  left: 0,
  color: vars.color.primary,
  fontWeight: 700,
})

export const colorRole = styleVariants({
  primary: { color: vars.color.primary },
  accent: { color: vars.color.accent },
  text: { color: vars.color.text },
  muted: { color: vars.color.muted },
  surface: { color: vars.color.surface },
  background: { color: vars.color.background },
})

export const tap = style({
  minHeight: 44,
  minWidth: 44,
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
})

const buttonBase = style([
  tap,
  {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: vars.space.xs,
    padding: `0.7em 1.25em`,
    borderRadius: vars.radius.button,
    fontWeight: 600,
    textTransform: vars.button.transform as 'none',
    lineHeight: 1.2,
    textDecoration: 'none',
    transition: 'transform 120ms ease, filter 120ms ease, background 120ms ease',
    selectors: { '&:active': { transform: 'scale(0.98)' }, '&:disabled': { opacity: 0.55, cursor: 'not-allowed' } },
  },
])

export const button = styleVariants({
  primary: [
    buttonBase,
    {
      background: vars.color.primary,
      color: vars.color.onPrimary,
      selectors: { '&:hover': { filter: 'brightness(1.06)' } },
    },
  ],
  secondary: [
    buttonBase,
    { background: vars.color.surface, color: vars.color.text, border: `1px solid ${vars.color.border}` },
  ],
  outline: [buttonBase, { border: `2px solid ${vars.color.primary}`, color: vars.color.primary }],
  link: [buttonBase, { color: vars.color.primary, textDecoration: 'underline', paddingInline: vars.space.xs }],
  soft: [buttonBase, { background: vars.color.surface, color: vars.color.primary }],
})

export const buttons = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.sm,
  '@container': { [tablet]: { flexDirection: 'row', flexWrap: 'wrap' } },
})
export const buttonsStack = style({ '@container': { [tablet]: { flexDirection: 'column' } } })
export const buttonsRow = style({ flexDirection: 'row', flexWrap: 'wrap' })
export const buttonsCenter = style({ justifyContent: 'center' })
export const buttonItem = style({ width: '100%', '@container': { [tablet]: { width: 'auto', minWidth: 160 } } })
export const buttonFull = style({ '@container': { [tablet]: { width: '100%' } } })

export const imageFrame = style({
  position: 'relative',
  overflow: 'hidden',
  borderRadius: vars.radius.card,
  background: vars.color.surface,
})
export const imageAspect = styleVariants({
  auto: {},
  '1:1': { aspectRatio: '1 / 1' },
  '4:5': { aspectRatio: '4 / 5' },
  '3:2': { aspectRatio: '3 / 2' },
  '16:9': { aspectRatio: '16 / 9' },
  '9:16': { aspectRatio: '9 / 16' },
})
export const imageFill = style({ width: '100%', height: '100%', objectFit: 'cover' })
export const imageNatural = style({ width: '100%', height: 'auto' })
export const attribution = style({ fontSize: '0.75em', color: vars.color.muted, marginTop: vars.space.xs })
export const radius = styleVariants({
  none: { borderRadius: 0 },
  sm: { borderRadius: 6 },
  md: { borderRadius: 12 },
  lg: { borderRadius: 20 },
  full: { borderRadius: 999 },
})

export const video = style({
  position: 'relative',
  overflow: 'hidden',
  borderRadius: vars.radius.card,
  background: '#000',
  width: '100%',
})
export const videoFrame = style({ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 })

export const cards = style({
  display: 'grid',
  gap: vars.space.md,
  gridTemplateColumns: '1fr',
  '@container': {
    [tablet]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
    [desktop]: { gridTemplateColumns: 'repeat(var(--jx-cols, 3), minmax(0, 1fr))' },
  },
})
export const cardsCarousel = style({
  display: 'flex',
  gap: vars.space.md,
  overflowX: 'auto',
  scrollSnapType: 'x mandatory',
  paddingBottom: vars.space.xs,
  marginInline: `calc(-1 * ${vars.space.md})`,
  paddingInline: vars.space.md,
  scrollbarWidth: 'thin',
})
globalStyle(`${cardsCarousel} > *`, { flex: '0 0 78%', scrollSnapAlign: 'start' })
export const cardsList = style({ display: 'flex', flexDirection: 'column', gap: vars.space.sm })
export const card = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  borderRadius: vars.radius.card,
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  textAlign: 'left',
})
export const cardBody = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.xs,
  padding: vars.space.md,
  flex: '1 1 auto',
})
export const cardImage = style({ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover' })
export const badge = style({
  position: 'absolute',
  top: vars.space.sm,
  left: vars.space.sm,
  background: vars.color.accent,
  color: vars.color.onAccent,
  borderRadius: 999,
  padding: '0.15em 0.65em',
  fontSize: '0.75em',
  fontWeight: 700,
})
export const price = style({ fontSize: '1.25em', fontWeight: 700 })
export const cardAction = style({ marginTop: 'auto', paddingTop: vars.space.sm })

export const countdown = style({ display: 'flex', gap: vars.space.sm, justifyContent: 'center', flexWrap: 'wrap' })
export const countdownUnit = style({
  minWidth: 64,
  padding: vars.space.sm,
  borderRadius: vars.radius.card,
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  textAlign: 'center',
})
export const countdownValue = style({
  fontFamily: vars.font.heading,
  fontSize: '1.75em',
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
})
export const countdownLabel = style({
  fontSize: '0.75em',
  color: vars.color.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
})

export const spacer = styleVariants({ sm: { height: 8 }, md: { height: 20 }, lg: { height: 36 }, xl: { height: 56 } })
export const rule = style({ borderTop: `1px solid ${vars.color.border}`, width: '100%', alignSelf: 'center' })

export const fieldset = style({ border: 0, display: 'flex', flexDirection: 'column', gap: vars.space.sm, minWidth: 0 })
export const legend = style({
  fontFamily: vars.font.heading,
  fontSize: `clamp(1.2rem, 2.5cqi + 0.7rem, 1.75rem)`,
  fontWeight: 700,
  lineHeight: 1.2,
  marginBottom: vars.space.sm,
  padding: 0,
})
export const hint = style({ fontSize: '0.85em', color: vars.color.muted })
export const error = style({ fontSize: '0.875em', color: '#b91c1c', fontWeight: 600 })

export const options = style({ display: 'grid', gap: vars.space.sm, gridTemplateColumns: '1fr' })
export const optionsButtons = style({ display: 'flex', flexWrap: 'wrap', gap: vars.space.sm })
export const optionsPictures = style({
  display: 'grid',
  gap: vars.space.sm,
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  '@container': {
    [tablet]: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
    [desktop]: { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' },
  },
})
export const optionsYesNo = style({
  display: 'grid',
  gap: vars.space.sm,
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
})

export const option = style([
  tap,
  {
    display: 'flex',
    alignItems: 'center',
    gap: vars.space.sm,
    width: '100%',
    padding: `0.75em 1em`,
    borderRadius: vars.radius.input,
    border: `1.5px solid ${vars.color.border}`,
    background: vars.color.background,
    textAlign: 'left',
    transition: 'border-color 120ms ease, background 120ms ease',
    selectors: {
      '&:hover': { borderColor: vars.color.primary },
      '&[aria-checked="true"], &[aria-pressed="true"]': {
        borderColor: vars.color.primary,
        background: vars.color.surface,
        boxShadow: `inset 0 0 0 1px ${vars.color.primary}`,
      },
    },
  },
])
export const optionPill = style({ width: 'auto', borderRadius: 999, justifyContent: 'center' })
export const optionPicture = style({
  flexDirection: 'column',
  padding: 0,
  overflow: 'hidden',
  alignItems: 'stretch',
  textAlign: 'center',
})
export const optionPictureImage = style({ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' })
export const optionPictureLabel = style({ padding: vars.space.sm })
export const optionMark = style({
  width: 20,
  height: 20,
  flex: '0 0 20px',
  borderRadius: 999,
  border: `2px solid ${vars.color.border}`,
  selectors: {
    [`${option}[aria-checked="true"] &`]: {
      borderColor: vars.color.primary,
      background: vars.color.primary,
      boxShadow: `inset 0 0 0 3px ${vars.color.background}`,
    },
  },
})
export const optionMarkSquare = style({ borderRadius: 5 })

export const input = style({
  width: '100%',
  minHeight: 48,
  padding: '0.7em 0.9em',
  fontSize: 'max(16px, 1em)',
  borderRadius: vars.radius.input,
  border: `1.5px solid ${vars.color.border}`,
  background: vars.color.background,
  selectors: { '&[aria-invalid="true"]': { borderColor: '#b91c1c' }, '&:focus': { borderColor: vars.color.primary } },
})
export const inputFilled = style({ background: vars.color.surface, borderColor: 'transparent' })
export const inputUnderline = style({ borderWidth: '0 0 2px 0', borderRadius: 0, paddingInline: 0 })
export const textarea = style([input, { minHeight: 112, resize: 'vertical' }])

export const formGrid = style({
  display: 'grid',
  gap: vars.space.md,
  gridTemplateColumns: '1fr',
  '@container': { [tablet]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } },
})
export const fieldFull = style({ gridColumn: '1 / -1' })
export const field = style({ display: 'flex', flexDirection: 'column', gap: vars.space.xs, minWidth: 0 })
export const label = style({ fontWeight: 600, fontSize: '0.95em' })
export const consent = style({
  display: 'flex',
  gap: vars.space.sm,
  alignItems: 'flex-start',
  fontSize: '0.9em',
  cursor: 'pointer',
})
export const checkbox = style({
  width: 22,
  height: 22,
  flex: '0 0 22px',
  marginTop: 2,
  accentColor: vars.color.primary,
})
export const honeypot = style({ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' })

export const rating = style({ display: 'flex', flexWrap: 'wrap', gap: vars.space.xs })
export const ratingNumbers = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(44px, 1fr))',
  gap: vars.space.xs,
})
export const ratingCell = style([
  tap,
  {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: vars.radius.input,
    border: `1.5px solid ${vars.color.border}`,
    fontWeight: 600,
    selectors: {
      '&[aria-checked="true"]': {
        background: vars.color.primary,
        color: vars.color.onPrimary,
        borderColor: vars.color.primary,
      },
    },
  },
])
export const star = style([
  tap,
  { fontSize: '2em', color: vars.color.border, selectors: { '&[data-on="true"]': { color: vars.color.accent } } },
])
export const ratingLabels = style({
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.8em',
  color: vars.color.muted,
})

const pulse = keyframes({ '0%': { opacity: 0.4 }, '50%': { opacity: 1 }, '100%': { opacity: 0.4 } })
export const busy = style({ animation: `${pulse} 1.2s ease-in-out infinite` })

export const chatButton = style([
  tap,
  {
    position: 'fixed',
    right: `calc(${vars.space.md} + env(safe-area-inset-right))`,
    bottom: `calc(${vars.space.md} + env(safe-area-inset-bottom))`,
    zIndex: 10,
    borderRadius: 999,
    padding: '0.7em 1.1em',
    background: vars.color.primary,
    color: vars.color.onPrimary,
    fontWeight: 600,
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  },
])
export const chatPanel = style({
  position: 'fixed',
  inset: 'auto 0 0 0',
  zIndex: 11,
  maxHeight: '80vh',
  display: 'flex',
  flexDirection: 'column',
  background: vars.color.background,
  color: vars.color.text,
  borderRadius: `${vars.radius.card} ${vars.radius.card} 0 0`,
  boxShadow: '0 -12px 40px rgba(0,0,0,0.25)',
  '@container': {
    [tablet]: { inset: `auto ${vars.space.md} ${vars.space.md} auto`, width: 380, borderRadius: vars.radius.card },
  },
})
export const chatLog = style({
  flex: '1 1 auto',
  overflowY: 'auto',
  padding: vars.space.md,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.sm,
})
export const chatBubble = style({
  padding: '0.6em 0.85em',
  borderRadius: vars.radius.card,
  background: vars.color.surface,
  maxWidth: '90%',
})
export const chatMine = style({ alignSelf: 'flex-end', background: vars.color.primary, color: vars.color.onPrimary })
export const chatForm = style({
  display: 'flex',
  gap: vars.space.xs,
  padding: vars.space.sm,
  borderTop: `1px solid ${vars.color.border}`,
})
export const chatHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: `${vars.space.sm} ${vars.space.md}`,
  borderBottom: `1px solid ${vars.color.border}`,
  fontWeight: 600,
})
export const chatSuggestions = style({ display: 'flex', flexWrap: 'wrap', gap: vars.space.xs })
