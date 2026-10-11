import { produce } from 'immer'
import type { IdGen } from '../ids'
import type { JourneyDoc } from '../model/types'
import {
  clone,
  exportSlug,
  ITEM_ATTR,
  locate,
  type OpResult,
  type Path,
  removePortsWithPrefix,
  result,
  setIn,
} from './core'

function itemsOf(element: { type: string; props: Record<string, unknown> }): Record<string, unknown>[] {
  const meta = ITEM_ATTR[element.type]
  if (!meta) return []
  element.props[meta.attr] ??= []
  return element.props[meta.attr] as Record<string, unknown>[]
}

function portsFor(elementId: string, itemId: string): string[] {
  return [`${elementId}:${itemId}`, `${elementId}:opt:${itemId}`, `${elementId}:band:${itemId}`]
}

export function addItem(elementId: string, item: Record<string, unknown>, index?: number) {
  return (doc: JourneyDoc, ids: IdGen): OpResult => {
    const found = locate(doc, elementId)
    if (!found) return result(doc)
    const meta = ITEM_ATTR[found.element.type]
    if (!meta) return result(doc)
    let created = ''
    const next = produce(doc, draft => {
      const located = locate(draft, elementId)
      if (!located) return
      const items = itemsOf(located.element as never)
      const fresh: Record<string, unknown> = { ...item, id: ids(meta.kind) }
      if (found.element.type === 'choice' && typeof fresh.label === 'string') fresh.value ??= exportSlug(fresh.label)
      created = String(fresh.id)
      items.splice(index ?? items.length, 0, fresh)
    })
    return result(next, { select: { kind: 'item', screenId: found.screen.id, elementId, itemId: created } })
  }
}

export function updateItem(elementId: string, itemId: string, path: Path, value: unknown) {
  return (doc: JourneyDoc): OpResult => {
    if (!locate(doc, elementId)) return result(doc)
    return result(
      produce(doc, draft => {
        const located = locate(draft, elementId)
        const item = located ? itemsOf(located.element as never).find(i => i.id === itemId) : undefined
        if (item) setIn(item, path, value)
      }),
    )
  }
}

export function moveItem(elementId: string, from: number, to: number) {
  return (doc: JourneyDoc): OpResult => {
    if (!locate(doc, elementId) || from === to) return result(doc)
    return result(
      produce(doc, draft => {
        const located = locate(draft, elementId)
        if (!located) return
        const items = itemsOf(located.element as never)
        if (to < 0 || to >= items.length) return
        const [moved] = items.splice(from, 1)
        if (moved) items.splice(to, 0, moved)
      }),
    )
  }
}

export function deleteItem(elementId: string, itemId: string) {
  return (doc: JourneyDoc): OpResult => {
    const found = locate(doc, elementId)
    if (!found) return result(doc)
    let removed = 0
    const next = produce(doc, draft => {
      const located = locate(draft, elementId)
      if (!located) return
      const meta = ITEM_ATTR[located.element.type]
      if (!meta) return
      const items = itemsOf(located.element as never)
      located.element.props = { ...located.element.props, [meta.attr]: items.filter(i => i.id !== itemId) } as never
      const ports = draft.links?.[found.screen.id]
      for (const port of portsFor(elementId, itemId)) {
        if (ports?.[port]) {
          delete ports[port]
          removed += 1
        }
      }
    })
    return result(next, {
      select: { kind: 'element', screenId: found.screen.id, elementId },
      toast: removed ? 'Removed item and its path' : undefined,
      removedLinks: removed,
    })
  }
}

export function pasteItems(
  elementId: string,
  lines: string[],
  field: string,
  maxLength: number,
  template: Record<string, unknown> = {},
) {
  return (doc: JourneyDoc, ids: IdGen): OpResult => {
    const found = locate(doc, elementId)
    const meta = found ? ITEM_ATTR[found.element.type] : undefined
    if (!found || !meta) return result(doc)
    return result(
      produce(doc, draft => {
        const located = locate(draft, elementId)
        if (!located) return
        const items = itemsOf(located.element as never)
        for (const line of lines.map(l => l.trim()).filter(Boolean)) {
          const label = line.slice(0, maxLength)
          const item: Record<string, unknown> = { ...clone(template), id: ids(meta.kind), [field]: label }
          if (found.element.type === 'choice') item.value = exportSlug(label)
          items.push(item)
        }
      }),
    )
  }
}

export function clearBranchLinks(elementId: string) {
  return (doc: JourneyDoc): OpResult => {
    const found = locate(doc, elementId)
    if (!found) return result(doc)
    return result(
      produce(doc, draft => {
        removePortsWithPrefix(draft, found.screen.id, [`${elementId}:opt`, `${elementId}:band`])
      }),
    )
  }
}
