import { buildIndex } from '../analysis'
import { isAllGroup, isAnyGroup } from '../model/guards'
import type { AllGroup, AnyGroup, JourneyDoc, Rule } from '../model/types'
import { outline } from '../outline'
import type { Vars } from './state'

export type Condition = Rule['when']
type LeafCondition = Exclude<Condition, AllGroup | AnyGroup>

function normalizeText(value: unknown): string | null {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value !== 'string') return null
  return value.trim().toLocaleLowerCase().normalize('NFC')
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.trim())
    return value.trim() !== '' && Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  if (value.every(item => typeof item === 'string')) return value as string[]
  return null
}

function topOutcomeWinner(doc: JourneyDoc, vars: Vars): string | null {
  const tally = vars.outcomes
  if (typeof tally !== 'object' || tally === null || Array.isArray(tally)) return null
  const entries = Object.entries(tally as Record<string, unknown>).filter((entry): entry is [string, number] => {
    const [, count] = entry
    return typeof count === 'number' && Number.isFinite(count)
  })
  if (entries.length === 0) return null
  const best = Math.max(...entries.map(([, count]) => count))
  const leaders = new Set(entries.filter(([, count]) => count === best).map(([screenId]) => screenId))
  if (leaders.size === 1) return [...leaders][0] ?? null
  const order = outline(doc, buildIndex(doc))
  return order.map(row => row.stepId).find(stepId => leaders.has(stepId)) ?? null
}

function evaluateLeaf(when: LeafCondition, vars: Vars, doc: JourneyDoc): boolean {
  const answer = vars[when.answer ?? '']
  switch (when.op) {
    case 'equals':
      return normalizeText(answer) !== null && normalizeText(answer) === normalizeText(when.value)
    case 'notEquals': {
      const actual = normalizeText(answer)
      return actual !== null && actual !== normalizeText(when.value)
    }
    case 'contains': {
      const actual = normalizeText(answer)
      const needle = normalizeText(when.value)
      return actual !== null && needle !== null && actual.includes(needle)
    }
    case 'notContains': {
      const actual = normalizeText(answer)
      const needle = normalizeText(when.value)
      return actual !== null && needle !== null && !actual.includes(needle)
    }
    case 'isEmpty':
      return isEmptyValue(answer)
    case 'isNotEmpty':
      return !isEmptyValue(answer)
    case 'eq': {
      const actual = toNumber(answer)
      const expected = toNumber(when.value)
      return actual !== null && expected !== null && actual === expected
    }
    case 'neq': {
      const actual = toNumber(answer)
      const expected = toNumber(when.value)
      return actual !== null && expected !== null && actual !== expected
    }
    case 'gt': {
      const actual = toNumber(answer)
      const expected = toNumber(when.value)
      return actual !== null && expected !== null && actual > expected
    }
    case 'gte': {
      const actual = toNumber(answer)
      const expected = toNumber(when.value)
      return actual !== null && expected !== null && actual >= expected
    }
    case 'lt': {
      const actual = toNumber(answer)
      const expected = toNumber(when.value)
      return actual !== null && expected !== null && actual < expected
    }
    case 'lte': {
      const actual = toNumber(answer)
      const expected = toNumber(when.value)
      return actual !== null && expected !== null && actual <= expected
    }
    case 'between': {
      const actual = toNumber(answer)
      const low = toNumber(when.value)
      const high = toNumber(when.value2)
      return actual !== null && low !== null && high !== null && actual >= low && actual <= high
    }
    case 'anyOf':
      return typeof answer === 'string' && Array.isArray(when.value) && (when.value as unknown[]).includes(answer)
    case 'noneOf':
      return typeof answer === 'string' && Array.isArray(when.value) && !(when.value as unknown[]).includes(answer)
    case 'includesAny': {
      const actual = asStringArray(answer)
      return (
        actual !== null &&
        Array.isArray(when.value) &&
        (when.value as unknown[]).some(option => actual.includes(option as string))
      )
    }
    case 'includesAll': {
      const actual = asStringArray(answer)
      return (
        actual !== null &&
        Array.isArray(when.value) &&
        (when.value as unknown[]).every(option => actual.includes(option as string))
      )
    }
    case 'includesNone': {
      const actual = asStringArray(answer)
      return (
        actual !== null &&
        Array.isArray(when.value) &&
        !(when.value as unknown[]).some(option => actual.includes(option as string))
      )
    }
    case 'isTrue':
      return answer === true
    case 'isFalse':
      return answer === false
    case 'is':
      return answer === when.value
    case 'topOutcome':
      return topOutcomeWinner(doc, vars) === when.value
    case 'before': {
      const actual = typeof answer === 'string' ? Date.parse(answer) : NaN
      const limit = typeof when.value === 'string' ? Date.parse(when.value) : NaN
      return Number.isFinite(actual) && Number.isFinite(limit) && actual < limit
    }
    case 'after': {
      const actual = typeof answer === 'string' ? Date.parse(answer) : NaN
      const limit = typeof when.value === 'string' ? Date.parse(when.value) : NaN
      return Number.isFinite(actual) && Number.isFinite(limit) && actual > limit
    }
    default:
      return false
  }
}

export function evaluate(when: Condition, vars: Vars, doc: JourneyDoc): boolean {
  if (isAllGroup(when)) return when.all.every(condition => evaluate(condition, vars, doc))
  if (isAnyGroup(when)) return when.any.some(condition => evaluate(condition, vars, doc))
  return evaluateLeaf(when, vars, doc)
}

export function leaves(condition: Condition): Condition[] {
  if (isAllGroup(condition)) return [...condition.all]
  if (isAnyGroup(condition)) return [...condition.any]
  return [condition]
}
