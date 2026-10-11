import type { Draft } from 'immer'
import type { IdGen, IdKind } from '../ids'
import type { Element, JourneyDoc, Screen } from '../model/types'

export type Path = readonly (string | number)[]

export interface Effects {
  select?: Selection | undefined
  toast?: string | undefined
  removedLinks?: number | undefined
}

export type Selection =
  | { kind: 'none' }
  | { kind: 'screen'; screenId: string }
  | { kind: 'element'; screenId: string; elementId: string }
  | { kind: 'item'; screenId: string; elementId: string; itemId: string }
  | { kind: 'step'; stepId: string }
  | { kind: 'theme' }
  | { kind: 'settings' }

export interface OpResult {
  doc: JourneyDoc
  effects: Effects
}

export type Op = (doc: JourneyDoc, ids: IdGen) => OpResult

export const ITEM_ATTR: Record<string, { attr: string; kind: IdKind }> = {
  buttons: { attr: 'items', kind: 'it' },
  cards: { attr: 'items', kind: 'it' },
  choice: { attr: 'options', kind: 'opt' },
  form: { attr: 'fields', kind: 'fld' },
  rating: { attr: 'bands', kind: 'band' },
}

export function result(doc: JourneyDoc, effects: Effects = {}): OpResult {
  return { doc, effects }
}

export function locate(
  doc: JourneyDoc | Draft<JourneyDoc>,
  elementId: string,
): { screen: Screen; element: Element; index: number } | null {
  for (const screen of Object.values(doc.screens ?? {})) {
    const index = (screen.elements ?? []).findIndex(el => el.id === elementId)
    if (index >= 0) return { screen: screen as Screen, element: (screen.elements ?? [])[index] as Element, index }
  }
  return null
}

export function setIn(target: Record<string, unknown>, path: Path, value: unknown): void {
  let cursor: Record<string | number, unknown> = target
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i] as string | number
    const next = path[i + 1]
    if (cursor[key] === undefined || cursor[key] === null) cursor[key] = typeof next === 'number' ? [] : {}
    cursor = cursor[key] as Record<string | number, unknown>
  }
  const last = path[path.length - 1] as string | number
  if (value === undefined) delete cursor[last]
  else cursor[last] = value
}

export function getIn(target: unknown, path: Path): unknown {
  let cursor = target
  for (const key of path) {
    if (cursor === null || cursor === undefined) return undefined
    cursor = (cursor as Record<string | number, unknown>)[key]
  }
  return cursor
}

export function ensureLinks(doc: Draft<JourneyDoc>): Record<string, Record<string, string>> {
  doc.links ??= {}
  return doc.links
}

export function removePortsWithPrefix(doc: Draft<JourneyDoc>, stepId: string, prefixes: string[]): number {
  const ports = doc.links?.[stepId]
  if (!ports) return 0
  let removed = 0
  for (const port of Object.keys(ports)) {
    if (prefixes.some(prefix => port === prefix || port.startsWith(`${prefix}:`))) {
      delete ports[port]
      removed += 1
    }
  }
  if (Object.keys(ports).length === 0) delete doc.links?.[stepId]
  return removed
}

export function inboundRefs(doc: JourneyDoc | Draft<JourneyDoc>, target: string): { from: string; port: string }[] {
  const refs: { from: string; port: string }[] = []
  for (const [from, ports] of Object.entries(doc.links ?? {})) {
    for (const [port, to] of Object.entries(ports)) if (to === target) refs.push({ from, port })
  }
  return refs
}

export function stepIndex(doc: JourneyDoc | Draft<JourneyDoc>, stepId: string): number {
  return (doc.steps ?? []).findIndex(step => step.id === stepId)
}

export function allKeys(doc: JourneyDoc | Draft<JourneyDoc>): Set<string> {
  const keys = new Set<string>()
  for (const screen of Object.values(doc.screens ?? {})) {
    for (const el of screen.elements ?? []) {
      if (el.type === 'choice' || el.type === 'rating') keys.add(el.props.key)
      if (el.type === 'form') for (const field of el.props.fields ?? []) keys.add(field.key)
    }
  }
  return keys
}

const RESERVED = new Set(['score', 'outcomes', 'device', 'locale', 'referrer', 'now'])

export function slugifyKey(label: string, existing: Set<string>): string {
  let base = label
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (!base) base = 'answer'
  if (!/^[a-z]/.test(base)) base = `a_${base}`
  if (RESERVED.has(base) || base.startsWith('utm_') || base.startsWith('param')) base = `${base}_answer`
  base = base.slice(0, 40).replace(/_+$/, '')
  let candidate = base
  let n = 2
  while (existing.has(candidate)) {
    const suffix = `_${n}`
    candidate = base.slice(0, 40 - suffix.length) + suffix
    n += 1
  }
  existing.add(candidate)
  return candidate
}

export function exportSlug(label: string): string {
  return (
    label
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'option'
  )
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function pruneLinks(doc: Draft<JourneyDoc>): void {
  for (const [from, ports] of Object.entries(doc.links ?? {})) {
    if (Object.keys(ports).length === 0) delete doc.links?.[from]
  }
}
