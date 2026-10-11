import { createThemeContract } from '@vanilla-extract/css'

export const vars = createThemeContract({
  color: {
    primary: null,
    onPrimary: null,
    accent: null,
    onAccent: null,
    background: null,
    surface: null,
    text: null,
    muted: null,
    border: null,
    overlay: null,
  },
  font: { heading: null, body: null },
  radius: { button: null, card: null, input: null },
  space: { xs: null, sm: null, md: null, lg: null, xl: null },
  type: { scale: null },
  button: { transform: null },
})
