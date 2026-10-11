import { produce } from 'immer'
import type { Condition } from '../engine/conditions'
import type { IdGen } from '../ids'
import type { Element, JourneyDoc } from '../model/types'
import { allKeys, clone, locate, type OpResult, type Path, removePortsWithPrefix, result, setIn } from './core'
import { type ElementFragment, instantiateElement } from './instantiate'

export function insertElement(screenId: string, index: number, fragment: ElementFragment) {
  return (doc: JourneyDoc, ids: IdGen): OpResult => {
    if (!doc.screens?.[screenId]) return result(doc)
    let created = ''
    const next = produce(doc, draft => {
      const screen = draft.screens?.[screenId]
      if (!screen) return
      const el = instantiateElement(fragment, ids, allKeys(draft))
      created = el.id
      screen.elements ??= []
      screen.elements.splice(Math.max(0, Math.min(index, screen.elements.length)), 0, el as never)
    })
    return result(next, { select: { kind: 'element', screenId, elementId: created } })
  }
}

export function duplicateElement(elementId: string) {
  return (doc: JourneyDoc, ids: IdGen): OpResult => {
    const found = locate(doc, elementId)
    if (!found) return result(doc)
    let created = ''
    const next = produce(doc, draft => {
      const screen = draft.screens?.[found.screen.id]
      if (!screen) return
      const copy = instantiateElement(clone(found.element), ids, allKeys(draft))
      created = copy.id
      screen.elements?.splice(found.index + 1, 0, copy as never)
    })
    return result(next, { select: { kind: 'element', screenId: found.screen.id, elementId: created } })
  }
}

export function deleteElement(elementId: string) {
  return (doc: JourneyDoc): OpResult => {
    const found = locate(doc, elementId)
    if (!found) return result(doc)
    let removed = 0
    const next = produce(doc, draft => {
      const screen = draft.screens?.[found.screen.id]
      if (!screen) return
      screen.elements = (screen.elements ?? []).filter(el => el.id !== elementId)
      removed = removePortsWithPrefix(draft, found.screen.id, [elementId])
    })
    return result(next, {
      select: { kind: 'screen', screenId: found.screen.id },
      toast: removed ? `Removed element and ${removed} path${removed === 1 ? '' : 's'}` : 'Removed element',
      removedLinks: removed,
    })
  }
}

export function moveElement(elementId: string, toScreenId: string, toIndex: number) {
  return (doc: JourneyDoc): OpResult => {
    const found = locate(doc, elementId)
    if (!found || !doc.screens?.[toScreenId]) return result(doc)
    const next = produce(doc, draft => {
      const from = draft.screens?.[found.screen.id]
      const to = draft.screens?.[toScreenId]
      if (!from || !to) return
      const [el] = (from.elements ?? []).splice(found.index, 1)
      if (!el) return
      to.elements ??= []
      const index = found.screen.id === toScreenId && toIndex > found.index ? toIndex - 1 : toIndex
      to.elements.splice(Math.max(0, Math.min(index, to.elements.length)), 0, el)
      if (found.screen.id !== toScreenId) removePortsWithPrefix(draft, found.screen.id, [elementId])
    })
    return result(next, { select: { kind: 'element', screenId: toScreenId, elementId } })
  }
}

export function updateElement(elementId: string, path: Path, value: unknown) {
  return (doc: JourneyDoc): OpResult => {
    if (!locate(doc, elementId)) return result(doc)
    return result(
      produce(doc, draft => {
        const found = locate(draft, elementId)
        if (found) setIn(found.element as unknown as Record<string, unknown>, path, value)
      }),
    )
  }
}

export function setVisibility(elementId: string, condition: Condition | null) {
  return updateElement(elementId, ['visibleIf'], condition ?? undefined)
}

export function replaceElement(elementId: string, element: Element) {
  return (doc: JourneyDoc): OpResult => {
    const found = locate(doc, elementId)
    if (!found) return result(doc)
    return result(
      produce(doc, draft => {
        const screen = draft.screens?.[found.screen.id]
        if (screen?.elements) screen.elements[found.index] = element as never
      }),
    )
  }
}
