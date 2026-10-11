import { buildIndex, type DocIndex } from '@journey/analysis'
import type { Element, JourneyDoc, Screen } from '@journey/model/types'
import type { Op } from '@journey/ops/index'
import { stepName } from '@journey/summary'
import { useMemo } from 'react'
import { useEditor } from './index'

export function act(label: string, run: Op, coalesceKey?: string): void {
  useEditor.getState().dispatch({ label, run, ...(coalesceKey ? { coalesceKey } : {}) })
}

export function useIndex(): DocIndex | null {
  const doc = useEditor(state => state.doc)
  return useMemo(() => (doc ? buildIndex(doc) : null), [doc])
}

export function findElement(
  doc: JourneyDoc,
  elementId: string,
): { screen: Screen; element: Element; index: number } | null {
  for (const screen of Object.values(doc.screens ?? {})) {
    const index = (screen.elements ?? []).findIndex(el => el.id === elementId)
    const element = screen.elements?.[index]
    if (element) return { screen, element, index }
  }
  return null
}

export function useSelectedScreenId(): string | null {
  return useEditor(state => {
    const s = state.selection
    if (s.kind === 'screen' || s.kind === 'element' || s.kind === 'item') return s.screenId
    if (s.kind === 'step' && state.doc?.screens?.[s.stepId]) return s.stepId
    return null
  })
}

export function stepOptions(doc: JourneyDoc, exclude?: string): { value: string; label: string }[] {
  return (doc.steps ?? [])
    .filter(step => step.kind !== 'start' && step.id !== exclude)
    .map(step => ({ value: step.id, label: stepName(doc, step.id) }))
}

export function chain(...ops: (Op | null | false | undefined)[]): Op {
  return (doc, ids) => {
    let current = doc
    let effects = {}
    for (const op of ops) {
      if (!op) continue
      const next = op(current, ids)
      current = next.doc
      effects = { ...effects, ...next.effects }
    }
    return { doc: current, effects }
  }
}
