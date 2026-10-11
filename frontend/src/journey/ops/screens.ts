import { type Draft, produce } from 'immer'
import type { IdGen } from '../ids'
import type { JourneyDoc, Screen } from '../model/types'
import {
  allKeys,
  ensureLinks,
  inboundRefs,
  type OpResult,
  type Path,
  pruneLinks,
  result,
  setIn,
  stepIndex,
} from './core'
import { instantiateScreen, type Recipe, reId } from './instantiate'

function startId(doc: JourneyDoc | Draft<JourneyDoc>): string {
  return (doc.steps ?? []).find(step => step.kind === 'start')?.id ?? ''
}

function insertStep(doc: Draft<JourneyDoc>, stepId: string, afterStepId: string | null): void {
  doc.steps ??= []
  const index = afterStepId ? stepIndex(doc, afterStepId) : -1
  const step = { id: stepId, kind: 'screen' as const }
  if (index >= 0) doc.steps.splice(index + 1, 0, step)
  else doc.steps.push(step)
}

function wireAfter(doc: Draft<JourneyDoc>, newId: string, afterStepId: string | null): void {
  const links = ensureLinks(doc)
  const source = afterStepId ?? startId(doc)
  if (!source) return
  const previous = links[source]?.next
  if (afterStepId === null && previous) return
  links[source] = { ...(links[source] ?? {}), next: newId }
  if (previous && previous !== newId) links[newId] = { ...(links[newId] ?? {}), next: previous }
}

export function addScreenAfter(
  afterStepId: string | null,
  recipe: Recipe,
  options: { connect?: boolean; name?: string } = {},
) {
  return (doc: JourneyDoc, ids: IdGen): OpResult => {
    let created = ''
    const anchor = afterStepId && stepIndex(doc, afterStepId) >= 0 ? afterStepId : null
    const next = produce(doc, draft => {
      const screen = instantiateScreen(recipe, ids, allKeys(draft), options.name)
      created = screen.id
      draft.screens ??= {}
      draft.screens[screen.id] = screen as Draft<Screen>
      insertStep(draft, screen.id, anchor)
      if (options.connect ?? true) wireAfter(draft, screen.id, anchor)
    })
    return result(next, { select: { kind: 'screen', screenId: created } })
  }
}

export function duplicateScreen(screenId: string) {
  return (doc: JourneyDoc, ids: IdGen): OpResult => {
    const source = doc.screens?.[screenId]
    if (!source) return result(doc)
    let created = ''
    const next = produce(doc, draft => {
      const copy = reId(source, ids, allKeys(draft))
      copy.name = `${source.name} copy`.slice(0, 60)
      created = copy.id
      draft.screens ??= {}
      draft.screens[copy.id] = copy as Draft<Screen>
      insertStep(draft, copy.id, screenId)
      wireAfter(draft, copy.id, screenId)
    })
    return result(next, { select: { kind: 'screen', screenId: created }, toast: `Duplicated ‘${source.name}’` })
  }
}

export function deleteScreen(screenId: string) {
  return (doc: JourneyDoc): OpResult => {
    const screen = doc.screens?.[screenId]
    if (!screen) return result(doc)
    let removed = 0
    const next = produce(doc, draft => {
      const links = ensureLinks(draft)
      const own = links[screenId]?.next
      const continuation = own && own !== screenId ? own : undefined
      for (const ref of inboundRefs(draft, screenId)) {
        if (ref.from === screenId) continue
        const ports = links[ref.from]
        if (!ports) continue
        if (ref.port === 'next' && continuation && continuation !== ref.from) ports.next = continuation
        else delete ports[ref.port]
        removed += 1
      }
      delete links[screenId]
      pruneLinks(draft)
      delete draft.screens?.[screenId]
      draft.steps = (draft.steps ?? []).filter(step => step.id !== screenId)
      if (draft.assistant?.fallbackTarget === screenId) draft.assistant.fallbackTarget = null
    })
    const first = Object.keys(next.screens ?? {})[0]
    return result(next, {
      select: first ? { kind: 'screen', screenId: first } : { kind: 'none' },
      toast: removed
        ? `Removed ‘${screen.name}’ and ${removed} path${removed === 1 ? '' : 's'}`
        : `Removed ‘${screen.name}’`,
      removedLinks: removed,
    })
  }
}

export function moveScreenAfter(screenId: string, afterStepId: string) {
  return (doc: JourneyDoc): OpResult => {
    if (screenId === afterStepId || !doc.screens?.[screenId] || stepIndex(doc, afterStepId) < 0) return result(doc)
    let rewired = 0
    const next = produce(doc, draft => {
      const links = ensureLinks(draft)
      const continuation = links[screenId]?.next
      for (const ref of inboundRefs(draft, screenId)) {
        if (ref.port !== 'next') continue
        const ports = links[ref.from]
        if (!ports) continue
        if (continuation && continuation !== ref.from) ports.next = continuation
        else delete ports.next
        rewired += 1
      }
      const target = links[afterStepId]?.next
      links[afterStepId] = { ...(links[afterStepId] ?? {}), next: screenId }
      const own = { ...(links[screenId] ?? {}) }
      if (target && target !== screenId) own.next = target
      else delete own.next
      links[screenId] = own
      rewired += 1
      const steps = draft.steps ?? []
      const moving = steps.findIndex(step => step.id === screenId)
      const [step] = steps.splice(moving, 1)
      const at = steps.findIndex(s => s.id === afterStepId)
      if (step) steps.splice(at + 1, 0, step)
    })
    return result(next, { toast: `Moved screen · ${rewired} path${rewired === 1 ? '' : 's'} updated` })
  }
}

export function updateScreen(screenId: string, path: Path, value: unknown) {
  return (doc: JourneyDoc): OpResult => {
    if (!doc.screens?.[screenId]) return result(doc)
    return result(
      produce(doc, draft => {
        const screen = draft.screens?.[screenId]
        if (screen) setIn(screen as unknown as Record<string, unknown>, path, value)
      }),
    )
  }
}

export function insertScreenOnLink(stepId: string, port: string, recipe: Recipe, options: { name?: string } = {}) {
  return (doc: JourneyDoc, ids: IdGen): OpResult => {
    if (stepIndex(doc, stepId) < 0) return result(doc)
    let created = ''
    const next = produce(doc, draft => {
      const screen = instantiateScreen(recipe, ids, allKeys(draft), options.name)
      created = screen.id
      draft.screens ??= {}
      draft.screens[screen.id] = screen as Draft<Screen>
      insertStep(draft, screen.id, stepId)
      const links = ensureLinks(draft)
      const previous = links[stepId]?.[port]
      links[stepId] = { ...(links[stepId] ?? {}), [port]: screen.id }
      if (previous && previous !== screen.id) links[screen.id] = { next: previous }
    })
    return result(next, { select: { kind: 'screen', screenId: created } })
  }
}

export function renameScreen(screenId: string, name: string) {
  return updateScreen(screenId, ['name'], name.slice(0, 60))
}
