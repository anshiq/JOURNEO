import type { JourneyDoc, RedirectStep, Screen } from '../model/types'
import { stepById } from '../ports'
import { resolveTarget } from '../targets'
import { evaluate } from './conditions'
import { answerEvents, applyAnswers } from './scoring'
import { type EngineContext, type EngineEvent, type EngineState, HOP_LIMIT, type Transition, type Vars } from './state'

export function startStepId(doc: JourneyDoc): string {
  return (doc.steps ?? []).find(step => step.kind === 'start')?.id ?? ''
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function resolveExitPort(_doc: JourneyDoc, screen: Screen, port: string, answers: Vars): string {
  if (port !== 'next') return port
  for (const el of screen.elements ?? []) {
    if (el.type === 'choice' && (el.props.branchByAnswer ?? false) && !(el.props.multiple ?? false)) {
      const value = answers[el.props.key]
      if (typeof value === 'string') {
        if ((el.props.options ?? []).some(opt => opt.id === value)) return `${el.id}:opt:${value}`
        if (value === 'other' && (el.props.other ?? false)) return `${el.id}:opt:other`
      }
    } else if (el.type === 'rating' && (el.props.branchByScore ?? false)) {
      const numeric = toNumberOrNull(answers[el.props.key])
      if (numeric !== null) {
        const band = (el.props.bands ?? []).find(item => numeric >= (item.min ?? 0) && numeric <= (item.max ?? 10))
        if (band) return `${el.id}:band:${band.id}`
      }
    }
  }
  return port
}

type UrlConstructor = new (
  input: string,
) => { searchParams: { set: (key: string, value: string) => void }; toString: () => string }

function stringifyParam(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null
}

export function withParams(step: RedirectStep, vars: Vars): string {
  if (!(step.passParams ?? true)) return step.url
  const tracking: [string, string][] = []
  const params: [string, string][] = []
  for (const [key, value] of Object.entries(vars)) {
    const text = stringifyParam(value)
    if (text === null) continue
    if (key.startsWith('utm_')) tracking.push([key, text])
    else if (key.startsWith('param.')) params.push([key.slice('param.'.length), text])
  }
  if (tracking.length === 0 && params.length === 0) return step.url
  const Url = (globalThis as unknown as { URL: UrlConstructor }).URL
  try {
    const url = new Url(step.url)
    for (const [key, value] of [...tracking, ...params]) url.searchParams.set(key, value)
    return url.toString()
  } catch {
    return step.url
  }
}

function settle(
  doc: JourneyDoc,
  state: EngineState,
  target: string | null,
  vars: Vars,
  events: EngineEvent[],
  matched: Transition['matched'],
): Transition {
  let current = target
  let lastMatched = matched
  for (let hop = 0; hop < HOP_LIMIT; hop++) {
    if (current === null) {
      const last = state.stack[state.stack.length - 1]
      return {
        state: { ...state, status: 'ended' },
        events: [...events, { type: 'complete', step: last?.stepId ?? '' }],
      }
    }
    const step = stepById(doc, current)
    if (!step) {
      return {
        state: { ...state, status: 'ended' },
        events: [...events, { type: 'engine_error', reason: 'missing_step' }],
      }
    }
    if (step.kind === 'screen') {
      return {
        state: { ...state, stack: [...state.stack, { stepId: step.id, vars }] },
        events: [...events, { type: 'screen_view', step: step.id }],
        matched: lastMatched,
      }
    }
    if (step.kind === 'redirect') {
      return {
        state: {
          ...state,
          status: 'redirect',
          redirect: { url: withParams(step, vars), delayMs: step.delayMs ?? 0 },
        },
        events: [...events, { type: 'complete', step: step.id }],
        matched: lastMatched,
      }
    }
    if (step.kind === 'condition') {
      const rule = (step.rules ?? []).find(candidate => evaluate(candidate.when, vars, doc))
      lastMatched = { stepId: step.id, ruleId: rule?.id ?? 'else' }
      current = resolveTarget(doc, step.id, rule ? `rule:${rule.id}` : 'else')
      continue
    }
    current = resolveTarget(doc, step.id, 'next')
  }
  return { state: { ...state, status: 'ended' }, events: [...events, { type: 'engine_error', reason: 'hop_limit' }] }
}

export function start(doc: JourneyDoc, ctx: EngineContext): Transition {
  const first = resolveTarget(doc, startStepId(doc), 'next')
  return settle(doc, { stack: [], status: 'running' }, first, { ...ctx.system, score: 0, outcomes: {} }, [], undefined)
}

export function exit(doc: JourneyDoc, state: EngineState, port: string, answers: Vars): Transition {
  const top = state.stack[state.stack.length - 1]
  if (!top || state.status !== 'running') return { state, events: [] }
  const vars = applyAnswers(doc, top.stepId, top.vars, answers)
  const screen = doc.screens?.[top.stepId]
  const effective = screen ? resolveExitPort(doc, screen, port, answers) : port
  const events: EngineEvent[] = [
    { type: 'exit', step: top.stepId, port: effective },
    ...answerEvents(doc, top.stepId, answers),
  ]
  return settle(doc, state, resolveTarget(doc, top.stepId, effective), vars, events, undefined)
}

export function back(state: EngineState): EngineState {
  if (state.stack.length <= 1) return state
  return { ...state, stack: state.stack.slice(0, -1), status: 'running' }
}
