import type { AllGroup, AnyGroup, ConditionStep, RedirectStep, ScreenStep, StartStep } from './types'

export function isStartStep(step: { kind: string }): step is StartStep {
  return step.kind === 'start'
}

export function isScreenStep(step: { kind: string }): step is ScreenStep {
  return step.kind === 'screen'
}

export function isConditionStep(step: { kind: string }): step is ConditionStep {
  return step.kind === 'condition'
}

export function isRedirectStep(step: { kind: string }): step is RedirectStep {
  return step.kind === 'redirect'
}

export function isAllGroup(condition: unknown): condition is AllGroup {
  return typeof condition === 'object' && condition !== null && 'all' in condition
}

export function isAnyGroup(condition: unknown): condition is AnyGroup {
  return typeof condition === 'object' && condition !== null && 'any' in condition
}

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`)
}
