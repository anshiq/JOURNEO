import type { Theme } from '@journey/model/types'
import { assignInlineVars } from '@vanilla-extract/dynamic'
import { vars } from './contract.css'
import { contrast, isHex, mix, onColor } from './contrast'
import { fontStack, resolveFonts } from './fonts'

export interface ResolvedColors {
  primary: string
  onPrimary: string
  accent: string
  onAccent: string
  background: string
  surface: string
  text: string
  muted: string
  border: string
}

const DEFAULTS = { primary: '#4f46e5', accent: '#f97316', background: '#ffffff', surface: '#ffffff', text: '#111827' }
const RADII = {
  none: ['0px', '0px', '0px'],
  sm: ['4px', '6px', '4px'],
  md: ['10px', '14px', '8px'],
  lg: ['16px', '20px', '12px'],
  full: ['999px', '24px', '999px'],
} as const
const DENSITY = {
  compact: ['4px', '8px', '12px', '18px', '28px'],
  comfortable: ['6px', '10px', '16px', '24px', '36px'],
  spacious: ['8px', '14px', '22px', '32px', '48px'],
} as const
const SCALE = { compact: '0.94', default: '1', large: '1.08' } as const

const pick = (value: string | null | undefined, fallback: string) => (value && isHex(value) ? value : fallback)

export function resolveColors(theme: Theme | undefined, scheme: 'theme' | 'inverse' = 'theme'): ResolvedColors {
  const c = theme?.colors ?? {}
  const primary = pick(c.primary, DEFAULTS.primary)
  const accent = pick(c.accent, DEFAULTS.accent)
  let background = pick(c.background, DEFAULTS.background)
  let surface = pick(c.surface, DEFAULTS.surface)
  let text = pick(c.text, DEFAULTS.text)
  if (scheme === 'inverse') {
    background = text
    text = onColor(background)
    surface = mix(background, text, 0.08)
  }
  let muted = pick(c.muted, mix(text, background, 0.35))
  for (const weight of [0.3, 0.22, 0.12, 0]) {
    if (contrast(muted, background) >= 4.5 && contrast(muted, surface) >= 4.5) break
    muted = mix(text, background, weight)
  }
  return {
    primary,
    onPrimary: pick(c.onPrimary, onColor(primary)),
    accent,
    onAccent: onColor(accent),
    background,
    surface,
    text,
    muted,
    border: pick(c.border, mix(text, background, 0.85)),
  }
}

export function resolveColorRef(ref: string | null | undefined, colors: ResolvedColors): string | null {
  if (!ref) return null
  if (isHex(ref)) return ref
  return (colors as unknown as Record<string, string>)[ref] ?? null
}

export function compileTheme(theme: Theme | undefined, scheme: 'theme' | 'inverse' = 'theme'): Record<string, string> {
  const colors = resolveColors(theme, scheme)
  const fonts = resolveFonts(theme?.fonts)
  const radius = RADII[(theme?.radius ?? 'md') as keyof typeof RADII] ?? RADII.md
  const space = DENSITY[(theme?.density ?? 'comfortable') as keyof typeof DENSITY] ?? DENSITY.comfortable
  return assignInlineVars(vars, {
    color: { ...colors, overlay: 'rgba(0, 0, 0, 0.45)' },
    font: { heading: fontStack(fonts.heading), body: fontStack(fonts.body) },
    radius: { button: radius[0], card: radius[1], input: radius[2] },
    space: { xs: space[0], sm: space[1], md: space[2], lg: space[3], xl: space[4] },
    type: { scale: SCALE[(theme?.typeScale ?? 'default') as keyof typeof SCALE] ?? '1' },
    button: { transform: theme?.buttons?.case === 'upper' ? 'uppercase' : 'none' },
  })
}

export function backgroundStyle(
  background:
    | {
        type?: string
        color?: string | null
        gradient?: { from?: string; to?: string; direction?: string } | null
        image?: { src: string; darken?: number } | null
      }
    | null
    | undefined,
  colors: ResolvedColors,
): Record<string, string> {
  if (!background) return {}
  if (background.type === 'gradient' && background.gradient) {
    const angle =
      { down: '180deg', right: '90deg', diagonal: '135deg' }[background.gradient.direction ?? 'down'] ?? '180deg'
    const from = resolveColorRef(background.gradient.from ?? 'background', colors) ?? colors.background
    const to = resolveColorRef(background.gradient.to ?? 'surface', colors) ?? colors.surface
    return { backgroundImage: `linear-gradient(${angle}, ${from}, ${to})` }
  }
  if (background.type === 'image' && background.image?.src) {
    const darken = Math.min(80, Math.max(0, background.image.darken ?? 40)) / 100
    return {
      backgroundImage: `linear-gradient(rgba(0,0,0,${darken}), rgba(0,0,0,${darken})), url("${encodeURI(background.image.src)}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  const color = resolveColorRef(background.color, colors)
  return color ? { backgroundColor: color } : {}
}
