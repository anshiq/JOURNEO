import { produce } from 'immer'
import type { JourneyDoc } from '../model/types'
import { type OpResult, result } from './core'

const TOKEN = /\{\{\s*([A-Za-z0-9_.]+)\s*(\|[^}]*)?\}\}/g

function renameInCondition(when: unknown, from: string, to: string): void {
  if (!when || typeof when !== 'object') return
  const node = when as Record<string, unknown>
  if (Array.isArray(node.all)) for (const leaf of node.all) renameInCondition(leaf, from, to)
  if (Array.isArray(node.any)) for (const leaf of node.any) renameInCondition(leaf, from, to)
  if (node.answer === from) node.answer = to
}

function renameTokens(text: string, from: string, to: string): string {
  return text.replace(TOKEN, (match, name: string, rest: string | undefined) =>
    name === from ? `{{${to}${rest ?? ''}}}` : match,
  )
}

export function renameAnswer(from: string, to: string) {
  return (doc: JourneyDoc): OpResult => {
    if (!from || !to || from === to) return result(doc)
    return result(
      produce(doc, draft => {
        for (const screen of Object.values(draft.screens ?? {})) {
          for (const el of screen.elements ?? []) {
            const props = el.props as Record<string, unknown>
            if ((el.type === 'choice' || el.type === 'rating') && props.key === from) props.key = to
            if (el.type === 'form') for (const field of el.props.fields ?? []) if (field.key === from) field.key = to
            for (const prop of ['text', 'question'])
              if (typeof props[prop] === 'string') props[prop] = renameTokens(props[prop] as string, from, to)
            if (el.visibleIf) renameInCondition(el.visibleIf, from, to)
          }
        }
        for (const step of draft.steps ?? []) {
          if (step.kind === 'condition') for (const rule of step.rules ?? []) renameInCondition(rule.when, from, to)
        }
      }),
    )
  }
}
