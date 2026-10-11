import { produce } from 'immer'
import type { JourneyDoc, StyleProps } from '../model/types'
import { locate, type OpResult, result } from './core'

export type Scope = 'all' | 'mobileOnly' | 'tabletUp' | 'desktopOnly'
type StyleKey = keyof StyleProps

interface Responsive {
  tablet?: { style?: Record<string, unknown> | null; hidden?: boolean | null } | null
  desktop?: { style?: Record<string, unknown> | null; hidden?: boolean | null } | null
}

function bucket(target: Record<string, unknown>, device: 'tablet' | 'desktop'): Record<string, unknown> {
  target.responsive ??= {}
  const responsive = target.responsive as Record<string, Record<string, unknown>>
  responsive[device] ??= {}
  const entry = responsive[device] as Record<string, unknown>
  entry.style ??= {}
  return entry.style as Record<string, unknown>
}

function prune(target: Record<string, unknown>): void {
  const responsive = target.responsive as Record<string, Record<string, unknown> | undefined> | undefined
  if (!responsive) return
  for (const device of ['tablet', 'desktop']) {
    const entry = responsive[device]
    if (!entry) continue
    if (entry.style && Object.keys(entry.style as object).length === 0) delete entry.style
    if (Object.keys(entry).length === 0) delete responsive[device]
  }
  if (Object.keys(responsive).length === 0) delete target.responsive
}

export function applyScope(target: Record<string, unknown>, prop: string, value: unknown, scope: Scope): void {
  target.style ??= {}
  const base = target.style as Record<string, unknown>
  const responsive = (target.responsive ?? {}) as Responsive
  if (scope === 'all') {
    if (value === undefined) delete base[prop]
    else base[prop] = value
    for (const device of ['tablet', 'desktop'] as const) {
      const style = responsive[device]?.style
      if (style) delete style[prop]
    }
  } else if (scope === 'mobileOnly') {
    const tabletValue = responsive.tablet?.style?.[prop] ?? base[prop] ?? null
    if (value === undefined) delete base[prop]
    else base[prop] = value
    bucket(target, 'tablet')[prop] = tabletValue
  } else if (scope === 'tabletUp') {
    bucket(target, 'tablet')[prop] = value ?? null
    const desktop = responsive.desktop?.style
    if (desktop) delete desktop[prop]
  } else {
    bucket(target, 'desktop')[prop] = value ?? null
  }
  if (Object.keys(base).length === 0) delete target.style
  prune(target)
}

export function setStyle(elementId: string, prop: StyleKey, value: unknown, scope: Scope = 'all') {
  return (doc: JourneyDoc): OpResult => {
    if (!locate(doc, elementId)) return result(doc)
    return result(
      produce(doc, draft => {
        const found = locate(draft, elementId)
        if (found) applyScope(found.element as unknown as Record<string, unknown>, prop, value, scope)
      }),
    )
  }
}

export function resetOverride(elementId: string, prop: StyleKey, device: 'tablet' | 'desktop') {
  return (doc: JourneyDoc): OpResult =>
    result(
      produce(doc, draft => {
        const found = locate(draft, elementId)
        const target = found?.element as unknown as Record<string, unknown> | undefined
        const style = (target?.responsive as Responsive | undefined)?.[device]?.style
        if (!target || !style) return
        delete style[prop]
        prune(target)
      }),
    )
}

export function setHidden(elementId: string, hidden: boolean, scope: Scope = 'all') {
  return (doc: JourneyDoc): OpResult =>
    result(
      produce(doc, draft => {
        const found = locate(draft, elementId)
        if (!found) return
        const target = found.element as unknown as Record<string, unknown>
        target.responsive ??= {}
        const responsive = target.responsive as Record<string, Record<string, unknown>>
        if (scope === 'all') {
          target.hidden = hidden
          for (const device of ['tablet', 'desktop']) if (responsive[device]) delete responsive[device].hidden
        } else if (scope === 'mobileOnly') {
          const tablet = responsive.tablet?.hidden ?? target.hidden ?? false
          target.hidden = hidden
          responsive.tablet = { ...(responsive.tablet ?? {}), hidden: tablet }
        } else if (scope === 'tabletUp') {
          responsive.tablet = { ...(responsive.tablet ?? {}), hidden }
          if (responsive.desktop) delete responsive.desktop.hidden
        } else {
          responsive.desktop = { ...(responsive.desktop ?? {}), hidden }
        }
        if (target.hidden === false) delete target.hidden
        prune(target)
      }),
    )
}

export function resetDeviceAdjustments(screenId: string) {
  return (doc: JourneyDoc): OpResult =>
    result(
      produce(doc, draft => {
        const screen = draft.screens?.[screenId]
        if (!screen) return
        delete (screen as Record<string, unknown>).responsive
        for (const el of screen.elements ?? []) delete (el as Record<string, unknown>).responsive
      }),
    )
}

export function countAdjustments(screen: { responsive?: unknown; elements?: { responsive?: unknown }[] }): number {
  const count = (value: unknown) =>
    value && typeof value === 'object'
      ? Object.values(value as Record<string, unknown>).reduce<number>((total, entry) => {
          if (!entry || typeof entry !== 'object') return total
          const e = entry as Record<string, unknown>
          return total + Object.keys((e.style as object) ?? {}).length + ('hidden' in e ? 1 : 0) + ('src' in e ? 1 : 0)
        }, 0)
      : 0
  return count(screen.responsive) + (screen.elements ?? []).reduce((sum, el) => sum + count(el.responsive), 0)
}
