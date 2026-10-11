import { createContainer, globalLayer, globalStyle, style } from '@vanilla-extract/css'
import { vars } from '../theme/contract.css'

export const jx = createContainer('jx')
const reset = globalLayer('jx-reset')

export const root = style({
  containerName: jx,
  containerType: 'inline-size',
  position: 'relative',
  width: '100%',
  minHeight: '100%',
  fontFamily: vars.font.body,
  fontSize: `calc(1rem * ${vars.type.scale})`,
  color: vars.color.text,
  background: vars.color.background,
  lineHeight: 1.5,
  WebkitTextSizeAdjust: '100%',
  WebkitFontSmoothing: 'antialiased',
  overflowWrap: 'anywhere',
  isolation: 'isolate',
})

globalStyle(`${root} *, ${root} *::before, ${root} *::after`, {
  '@layer': { [reset]: { boxSizing: 'border-box', margin: 0, padding: 0 } },
})
globalStyle(`${root} :where(h1, h2, h3)`, {
  '@layer': {
    [reset]: {
      fontFamily: vars.font.heading,
      fontWeight: 700,
      lineHeight: 1.15,
      textWrap: 'balance',
    },
  },
})
globalStyle(`${root} :where(p, li)`, { '@layer': { [reset]: { textWrap: 'pretty' } } })
globalStyle(`${root} :where(button, input, select, textarea)`, {
  '@layer': {
    [reset]: {
      font: 'inherit',
      color: 'inherit',
      background: 'none',
      border: 'none',
    },
  },
})
globalStyle(`${root} :where(button)`, { '@layer': { [reset]: { cursor: 'pointer' } } })
globalStyle(`${root} :where(img, video, iframe)`, { '@layer': { [reset]: { display: 'block', maxWidth: '100%' } } })
globalStyle(`${root} :where(a)`, {
  '@layer': { [reset]: { color: vars.color.primary, textUnderlineOffset: '0.15em' } },
})
globalStyle(`${root} :where(button, a, input, select, textarea, [tabindex]):focus-visible`, {
  '@layer': {
    [reset]: {
      outline: `3px solid ${vars.color.primary}`,
      outlineOffset: '2px',
    },
  },
})
globalStyle(`${root} :where(ul, ol)`, { '@layer': { [reset]: { paddingLeft: '1.25em' } } })
globalStyle(`${root} *`, {
  '@layer': {
    [reset]: {
      '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none !important', transition: 'none !important' } },
    },
  },
})

export const srOnly = style({
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
})
