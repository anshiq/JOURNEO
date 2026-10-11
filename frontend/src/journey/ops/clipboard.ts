import type { IdGen } from '../ids'
import type { Element, JourneyDoc, Screen } from '../model/types'
import { allKeys, clone, locate, type OpResult, result } from './core'
import { insertElement } from './elements'

export const CLIPBOARD_MIME = 'application/x-journeo+json'

export type ClipboardPayload = { kind: 'element'; element: Element } | { kind: 'screen'; screen: Screen }

export function copyElement(doc: JourneyDoc, elementId: string): ClipboardPayload | null {
  const found = locate(doc, elementId)
  return found ? { kind: 'element', element: clone(found.element) } : null
}

export function isClipboardPayload(value: unknown): value is ClipboardPayload {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    (v.kind === 'element' && typeof v.element === 'object') || (v.kind === 'screen' && typeof v.screen === 'object')
  )
}

export function pasteElement(screenId: string, index: number, payload: ClipboardPayload) {
  return (doc: JourneyDoc, ids: IdGen): OpResult => {
    if (payload.kind !== 'element') return result(doc)
    allKeys(doc)
    return insertElement(screenId, index, payload.element as never)(doc, ids)
  }
}
