import { produce } from 'immer'
import type { IdGen } from '../ids'
import type { JourneyDoc } from '../model/types'
import { ensureLinks, inboundRefs, type OpResult, pruneLinks, result } from './core'

export function setLink(stepId: string, port: string, target: string | null) {
  return (doc: JourneyDoc): OpResult => {
    const exists = (id: string) => (doc.steps ?? []).some(step => step.id === id)
    if (!exists(stepId) || (target !== null && (!exists(target) || target === startOf(doc)))) return result(doc)
    return result(
      produce(doc, draft => {
        const links = ensureLinks(draft)
        const ports = { ...(links[stepId] ?? {}) }
        if (target) ports[port] = target
        else delete ports[port]
        if (Object.keys(ports).length) links[stepId] = ports
        else delete links[stepId]
      }),
    )
  }
}

function startOf(doc: JourneyDoc): string | undefined {
  return (doc.steps ?? []).find(step => step.kind === 'start')?.id
}

export function insertConditionOnLink(stepId: string, port: string) {
  return (doc: JourneyDoc, ids: IdGen): OpResult => {
    if (!(doc.steps ?? []).some(step => step.id === stepId)) return result(doc)
    let created = ''
    const next = produce(doc, draft => {
      const links = ensureLinks(draft)
      const previous = links[stepId]?.[port]
      created = ids('stp')
      const ruleId = ids('rule')
      draft.steps ??= []
      const at = draft.steps.findIndex(step => step.id === stepId)
      draft.steps.splice(at + 1, 0, {
        id: created,
        kind: 'condition',
        rules: [{ id: ruleId, label: 'Path 1', when: { op: 'isNotEmpty', answer: '' } as never }],
      })
      links[stepId] = { ...(links[stepId] ?? {}), [port]: created }
      if (previous) links[created] = { else: previous }
    })
    return result(next, { select: { kind: 'step', stepId: created } })
  }
}

export function insertRedirectOnLink(stepId: string, port: string, url = 'https://') {
  return (doc: JourneyDoc, ids: IdGen): OpResult => {
    if (!(doc.steps ?? []).some(step => step.id === stepId)) return result(doc)
    let created = ''
    const next = produce(doc, draft => {
      const links = ensureLinks(draft)
      created = ids('stp')
      draft.steps ??= []
      draft.steps.push({ id: created, kind: 'redirect', url, passParams: true, delayMs: 0 })
      links[stepId] = { ...(links[stepId] ?? {}), [port]: created }
    })
    return result(next, { select: { kind: 'step', stepId: created } })
  }
}

export function deleteStep(stepId: string) {
  return (doc: JourneyDoc): OpResult => {
    const step = (doc.steps ?? []).find(s => s.id === stepId)
    if (!step || step.kind === 'start' || step.kind === 'screen') return result(doc)
    const next = produce(doc, draft => {
      const links = ensureLinks(draft)
      const fallback = step.kind === 'condition' ? links[stepId]?.else : undefined
      const continuation = fallback && fallback !== stepId ? fallback : undefined
      for (const ref of inboundRefs(draft, stepId)) {
        if (ref.from === stepId) continue
        const ports = links[ref.from]
        if (!ports) continue
        if (continuation) ports[ref.port] = continuation
        else delete ports[ref.port]
      }
      delete links[stepId]
      draft.steps = (draft.steps ?? []).filter(s => s.id !== stepId)
      pruneLinks(draft)
    })
    return result(next, {
      select: { kind: 'none' },
      toast: step.kind === 'condition' ? 'Removed condition' : 'Removed redirect',
    })
  }
}
