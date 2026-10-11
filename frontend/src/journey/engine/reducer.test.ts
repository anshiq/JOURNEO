import { describe, expect, test } from 'vitest'
import type { JourneyDoc } from '../model/types'
import { back, exit, start } from './reducer'

function pointsDoc(): JourneyDoc {
  return {
    schemaVersion: 4,
    steps: [
      { id: 'stp_start', kind: 'start' },
      { id: 'scr_quiz', kind: 'screen' },
      { id: 'scr_end', kind: 'screen' },
    ],
    screens: {
      scr_quiz: {
        id: 'scr_quiz',
        name: 'Quiz',
        elements: [
          {
            id: 'el_pick',
            type: 'choice',
            props: {
              question: 'Pick',
              key: 'tier',
              scoring: 'points',
              autoAdvance: true,
              options: [
                { id: 'opt_vip', label: 'VIP', points: 5 },
                { id: 'opt_std', label: 'Standard', points: 1 },
              ],
            },
          },
        ],
      },
      scr_end: { id: 'scr_end', name: 'End', elements: [] },
    },
    links: { stp_start: { next: 'scr_quiz' }, scr_quiz: { next: 'scr_end' } },
  }
}

describe('engine reducer', () => {
  test('back restores vars so scores never double-count', () => {
    const doc = pointsDoc()
    const first = start(doc, { system: {} }).state
    const second = exit(doc, first, 'next', { tier: 'opt_vip' }).state
    expect(second.stack[1]?.vars.tier).toBe('opt_vip')
    expect(second.stack[1]?.vars.score).toBe(5)
    const rewound = back(second)
    expect(rewound.stack).toHaveLength(1)
    const retaken = exit(doc, rewound, 'next', { tier: 'opt_std' }).state
    expect(retaken.stack[1]?.vars.score).toBe(1)
    expect(retaken.stack[1]?.vars.tier).toBe('opt_std')
  })
  test('exit on a finished state is a no-op', () => {
    const doc = pointsDoc()
    const first = start(doc, { system: {} }).state
    const done = exit(doc, exit(doc, first, 'next', {}).state, 'next', {}).state
    expect(done.status).toBe('ended')
    expect(exit(doc, done, 'next', {}).events).toEqual([])
  })
  test('back on the first screen keeps state', () => {
    const doc = pointsDoc()
    const first = start(doc, { system: {} }).state
    expect(back(first)).toBe(first)
  })
  test('missing steps end with an engine error', () => {
    const doc = pointsDoc()
    doc.links = { stp_start: { next: 'scr_ghost' } }
    const transition = start(doc, { system: {} })
    expect(transition.state.status).toBe('ended')
    expect(transition.events.at(-1)).toEqual({ type: 'engine_error', reason: 'missing_step' })
  })
  test('start without a start step ends immediately', () => {
    const doc: JourneyDoc = { schemaVersion: 4, steps: [], screens: {} }
    const transition = start(doc, { system: {} })
    expect(transition.state.status).toBe('ended')
  })
  test('redirect appends only tracking and referenced params', () => {
    const doc: JourneyDoc = {
      schemaVersion: 4,
      steps: [
        { id: 'stp_start', kind: 'start' },
        { id: 'scr_first', kind: 'screen' },
        { id: 'stp_go', kind: 'redirect', url: 'https://example.com/shop?x=1', passParams: true },
      ],
      screens: { scr_first: { id: 'scr_first', name: 'First', elements: [] } },
      links: { stp_start: { next: 'scr_first' }, scr_first: { next: 'stp_go' } },
    }
    const first = start(doc, { system: { utm_source: 'ig', 'param.ref': 'abc', device: 'mobile' } }).state
    const done = exit(doc, first, 'next', {}).state
    expect(done.status).toBe('redirect')
    expect(done.redirect?.url).toBe('https://example.com/shop?x=1&utm_source=ig&ref=abc')
  })
})
