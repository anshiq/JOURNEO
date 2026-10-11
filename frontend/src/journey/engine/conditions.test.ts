import { describe, expect, test } from 'vitest'
import type { JourneyDoc } from '../model/types'
import { type Condition, evaluate } from './conditions'

const doc: JourneyDoc = { schemaVersion: 4, steps: [], screens: {} }

function check(when: Condition, vars: Record<string, unknown>): boolean {
  return evaluate(when, vars, doc)
}

describe('conditions', () => {
  test('text operators normalize case and whitespace', () => {
    const vars = { city: '  BERLIN ' }
    expect(check({ answer: 'city', op: 'equals', value: 'berlin' }, vars)).toBe(true)
    expect(check({ answer: 'city', op: 'notEquals', value: 'paris' }, vars)).toBe(true)
    expect(check({ answer: 'city', op: 'contains', value: 'ERL' }, vars)).toBe(true)
    expect(check({ answer: 'city', op: 'notContains', value: 'par' }, vars)).toBe(true)
    expect(check({ answer: 'missing', op: 'isEmpty' }, vars)).toBe(true)
    expect(check({ answer: 'city', op: 'isNotEmpty' }, vars)).toBe(true)
    expect(check({ answer: 'blank', op: 'isEmpty' }, { blank: '   ' })).toBe(true)
  })
  test('number operators reject non-numeric answers', () => {
    expect(check({ answer: 'n', op: 'gte', value: 5 }, { n: 5 })).toBe(true)
    expect(check({ answer: 'n', op: 'between', value: 1, value2: 10 }, { n: '7' })).toBe(true)
    expect(check({ answer: 'n', op: 'between', value: 1, value2: 10 }, { n: 11 })).toBe(false)
    expect(check({ answer: 'n', op: 'eq', value: 5 }, { n: 'five' })).toBe(false)
    expect(check({ answer: 'n', op: 'neq', value: 5 }, { n: 'five' })).toBe(false)
    expect(check({ answer: 'n', op: 'gt', value: 5 }, {})).toBe(false)
  })
  test('choice operators match option ids', () => {
    expect(check({ answer: 'tier', op: 'anyOf', value: ['opt_vip'] }, { tier: 'opt_vip' })).toBe(true)
    expect(check({ answer: 'tier', op: 'noneOf', value: ['opt_vip'] }, { tier: 'opt_std' })).toBe(true)
    expect(check({ answer: 'tier', op: 'anyOf', value: ['opt_vip'] }, { tier: 'opt_std' })).toBe(false)
    expect(check({ answer: 'tier', op: 'noneOf', value: ['opt_vip'] }, {})).toBe(false)
    expect(check({ answer: 'tags', op: 'includesAny', value: ['a'] }, { tags: ['b', 'a'] })).toBe(true)
    expect(check({ answer: 'tags', op: 'includesAll', value: ['a', 'b'] }, { tags: ['b', 'a'] })).toBe(true)
    expect(check({ answer: 'tags', op: 'includesNone', value: ['a'] }, { tags: ['b'] })).toBe(true)
    expect(check({ answer: 'tags', op: 'includesAny', value: ['a'] }, { tags: 'a' })).toBe(false)
  })
  test('boolean, device and date operators', () => {
    expect(check({ answer: 'consent', op: 'isTrue' }, { consent: true })).toBe(true)
    expect(check({ answer: 'consent', op: 'isFalse' }, { consent: false })).toBe(true)
    expect(check({ answer: 'consent', op: 'isTrue' }, { consent: 1 })).toBe(false)
    expect(check({ answer: 'device', op: 'is', value: 'mobile' }, { device: 'mobile' })).toBe(true)
    expect(check({ answer: 'device', op: 'is', value: 'mobile' }, { device: 'desktop' })).toBe(false)
    expect(check({ answer: 'dob', op: 'before', value: '2000-01-01' }, { dob: '1990-05-05' })).toBe(true)
    expect(check({ answer: 'dob', op: 'after', value: '2000-01-01' }, { dob: '1990-05-05' })).toBe(false)
    expect(check({ answer: 'dob', op: 'before', value: '2000-01-01' }, { dob: 'not a date' })).toBe(false)
  })
  test('groups combine leaves', () => {
    const when: Condition = {
      all: [
        { answer: 'tier', op: 'anyOf', value: ['opt_vip'] },
        { answer: 'city', op: 'isNotEmpty' },
      ],
    }
    expect(check(when, { tier: 'opt_vip', city: 'Berlin' })).toBe(true)
    expect(check(when, { tier: 'opt_vip', city: '' })).toBe(false)
    expect(check(when, { tier: 'opt_std', city: 'Berlin' })).toBe(false)
    const either: Condition = {
      any: [
        { answer: 'device', op: 'is', value: 'mobile' },
        { answer: 'tier', op: 'anyOf', value: ['opt_vip'] },
      ],
    }
    expect(check(either, { tier: 'opt_std', device: 'mobile' })).toBe(true)
    expect(check(either, { tier: 'opt_std', device: 'desktop' })).toBe(false)
  })
  test('unknown operators never match', () => {
    expect(check({ answer: 'x', op: 'nope', value: 'y' } as unknown as Condition, { x: 'y' })).toBe(false)
  })
})
