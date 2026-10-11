import { produce } from 'immer'
import type { IdGen } from '../ids'
import type { JourneyDoc } from '../model/types'
import { stepName } from '../summary'
import { type OpResult, type Path, result, setIn } from './core'

function conditionDraft(doc: { steps?: unknown[] }, stepId: string) {
  return (doc.steps as { id: string; kind: string; rules?: Record<string, unknown>[] }[] | undefined)?.find(
    step => step.id === stepId && step.kind === 'condition',
  )
}

export function addRule(stepId: string, rule: { label: string; when: unknown }) {
  return (doc: JourneyDoc, ids: IdGen): OpResult => {
    if (!conditionDraft(doc as never, stepId)) return result(doc)
    return result(
      produce(doc, draft => {
        const step = conditionDraft(draft as never, stepId)
        if (!step) return
        step.rules ??= []
        step.rules.push({ id: ids('rule'), label: rule.label, when: rule.when })
      }),
    )
  }
}

export function updateRule(stepId: string, ruleId: string, path: Path, value: unknown) {
  return (doc: JourneyDoc): OpResult =>
    result(
      produce(doc, draft => {
        const rule = conditionDraft(draft as never, stepId)?.rules?.find(r => r.id === ruleId)
        if (rule) setIn(rule, path, value)
      }),
    )
}

export function moveRule(stepId: string, from: number, to: number) {
  return (doc: JourneyDoc): OpResult =>
    result(
      produce(doc, draft => {
        const rules = conditionDraft(draft as never, stepId)?.rules
        if (!rules || to < 0 || to >= rules.length) return
        const [moved] = rules.splice(from, 1)
        if (moved) rules.splice(to, 0, moved)
      }),
    )
}

export function deleteRule(stepId: string, ruleId: string) {
  return (doc: JourneyDoc): OpResult =>
    result(
      produce(doc, draft => {
        const step = conditionDraft(draft as never, stepId)
        if (!step?.rules) return
        step.rules = step.rules.filter(r => r.id !== ruleId)
        delete draft.links?.[stepId]?.[`rule:${ruleId}`]
      }),
    )
}

export function updateStep(stepId: string, path: Path, value: unknown) {
  return (doc: JourneyDoc): OpResult =>
    result(
      produce(doc, draft => {
        const step = (draft.steps ?? []).find(s => s.id === stepId)
        if (step) setIn(step as unknown as Record<string, unknown>, path, value)
      }),
    )
}

export function goToTopResult(screenId: string, elementId: string) {
  return (doc: JourneyDoc, ids: IdGen): OpResult => {
    const element = doc.screens?.[screenId]?.elements?.find(el => el.id === elementId)
    if (element?.type !== 'choice') return result(doc)
    const outcomes = [
      ...new Set((element.props.options ?? []).map(option => option.outcome).filter((id): id is string => Boolean(id))),
    ].filter(id => doc.screens?.[id])
    if (outcomes.length === 0) return result(doc, { toast: 'Pick a result screen for each option first' })
    let created = ''
    const next = produce(doc, draft => {
      created = ids('stp')
      const rules = outcomes.map(outcome => ({
        id: ids('rule'),
        label: `Top result: ${stepName(doc, outcome)}`.slice(0, 60),
        when: { answer: 'outcomes' as const, op: 'topOutcome' as const, value: outcome },
      }))
      draft.steps ??= []
      const at = draft.steps.findIndex(step => step.id === screenId)
      draft.steps.splice(at + 1, 0, { id: created, kind: 'condition', label: 'Top result', rules })
      draft.links ??= {}
      const previous = draft.links[screenId]?.next
      draft.links[screenId] = { ...(draft.links[screenId] ?? {}), next: created }
      const ports: Record<string, string> = {}
      rules.forEach((rule, index) => {
        const target = outcomes[index]
        if (target) ports[`rule:${rule.id}`] = target
      })
      if (previous && previous !== created) ports.else = previous
      draft.links[created] = ports
    })
    return result(next, {
      select: { kind: 'step', stepId: created },
      toast: 'Added a condition that goes to the top result',
    })
  }
}
