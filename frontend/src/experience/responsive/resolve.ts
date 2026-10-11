import type { Element, Screen, ScreenLayout, ScreenOverride, StyleProps } from '@journey/model/types'
import type { Breakpoint } from '../constants'

export type Scope = 'all' | 'mobileOnly' | 'tabletUp' | 'desktopOnly'

type Overrides = { tablet?: { style?: StyleProps | null } | null; desktop?: { style?: StyleProps | null } | null }

function clean<T extends object>(value: T | null | undefined): Partial<T> {
  return Object.fromEntries(Object.entries(value ?? {}).filter(([, v]) => v !== undefined)) as Partial<T>
}

export function resolveStyle(
  element: { style?: StyleProps | null; responsive?: Overrides | null },
  bp: Breakpoint,
): StyleProps {
  const base = clean(element.style)
  if (bp === 'mobile') return base
  const tablet = { ...base, ...clean(element.responsive?.tablet?.style) }
  return bp === 'tablet' ? tablet : { ...tablet, ...clean(element.responsive?.desktop?.style) }
}

export function isHiddenAt(element: Element, bp: Breakpoint): boolean {
  const base = element.hidden ?? false
  if (bp === 'mobile') return base
  const tablet = element.responsive?.tablet?.hidden ?? base
  if (bp === 'tablet') return tablet
  return element.responsive?.desktop?.hidden ?? tablet
}

export function resolveSrc(element: Element, bp: Breakpoint, src: string): { src: string; srcset: string | undefined } {
  const tablet = element.responsive?.tablet
  const desktop = element.responsive?.desktop
  if (bp === 'desktop' && desktop?.src) return { src: desktop.src, srcset: desktop.srcset ?? undefined }
  if (bp !== 'mobile' && tablet?.src) return { src: tablet.src, srcset: tablet.srcset ?? undefined }
  return { src, srcset: undefined }
}

export interface ResolvedLayout {
  preset: 'stack' | 'split' | 'cover'
  width: 'narrow' | 'normal' | 'wide'
  hAlign: 'left' | 'center'
  vAlign: 'top' | 'center'
  spacing: 'compact' | 'comfortable' | 'spacious'
  mediaSide: 'left' | 'right'
  media: ScreenLayout['media']
}

export function resolveLayout(screen: Screen, bp: Breakpoint): ResolvedLayout {
  const layout = screen.layout ?? { preset: 'stack' }
  const base: ResolvedLayout = {
    preset: layout.preset ?? 'stack',
    width: layout.width ?? 'normal',
    hAlign: layout.hAlign ?? 'left',
    vAlign: layout.vAlign ?? 'top',
    spacing: layout.spacing ?? 'comfortable',
    mediaSide: layout.media?.side ?? 'right',
    media: layout.media,
  }
  const apply = (override: ScreenOverride | null | undefined) => {
    if (!override) return
    if (override.preset) base.preset = override.preset
    if (override.width) base.width = override.width
    if (override.hAlign) base.hAlign = override.hAlign
    if (override.mediaSide) base.mediaSide = override.mediaSide
  }
  if (bp !== 'mobile') apply(screen.responsive?.tablet)
  if (bp === 'desktop') apply(screen.responsive?.desktop)
  return base
}
