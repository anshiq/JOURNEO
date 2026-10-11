import { describe, expect, test } from 'vitest'
import { buildIndex } from './analysis'
import type { JourneyDoc } from './model/types'
import { outline } from './outline'

function branchedDoc(): JourneyDoc {
  return {
    schemaVersion: 4,
    steps: [
      { id: 'stp_start', kind: 'start' },
      { id: 'scr_quiz', kind: 'screen' },
      {
        id: 'stp_branch',
        kind: 'condition',
        rules: [{ id: 'rule_vip', label: 'VIP', when: { answer: 'tier', op: 'anyOf', value: ['opt_vip'] } }],
      },
      { id: 'scr_main', kind: 'screen' },
      { id: 'scr_vip', kind: 'screen' },
      { id: 'scr_lost', kind: 'screen' },
    ],
    screens: {
      scr_quiz: {
        id: 'scr_quiz',
        name: 'Quiz',
        elements: [
          {
            id: 'el_pick',
            type: 'choice',
            props: { question: 'Pick', key: 'tier', options: [{ id: 'opt_vip', label: 'VIP' }], autoAdvance: true },
          },
        ],
      },
      scr_main: { id: 'scr_main', name: 'Main', elements: [] },
      scr_vip: { id: 'scr_vip', name: 'VIP', elements: [] },
      scr_lost: { id: 'scr_lost', name: 'Lost', elements: [] },
    },
    links: {
      stp_start: { next: 'scr_quiz' },
      scr_quiz: { next: 'stp_branch' },
      stp_branch: { 'rule:rule_vip': 'scr_vip', else: 'scr_main' },
    },
  }
}

describe('outline', () => {
  test('shows each branch under its condition before the main path continues', () => {
    const doc = branchedDoc()
    const rows = outline(doc, buildIndex(doc))
    expect(rows.map(row => row.stepId)).toEqual([
      'stp_start',
      'scr_quiz',
      'stp_branch',
      'scr_vip',
      'scr_main',
      'scr_lost',
    ])
  })
  test('matches the analysis order used for issue sorting', () => {
    const doc = branchedDoc()
    const index = buildIndex(doc)
    const rows = outline(doc, index).filter(row => row.group === 'main')
    expect(rows.map(row => row.stepId)).toEqual(Object.keys(index.order).filter(id => rows.some(r => r.stepId === id)))
  })
  test('branch screens carry path labels and depth', () => {
    const doc = branchedDoc()
    const rows = outline(doc, buildIndex(doc))
    const vip = rows.find(row => row.stepId === 'scr_vip')
    expect(vip?.depth).toBe(1)
    expect(vip?.pathLabel).toBe('VIP')
    expect(vip?.group).toBe('main')
    expect(rows.find(row => row.stepId === 'scr_main')?.depth).toBe(0)
  })
  test('unconnected steps group separately and terminals flag', () => {
    const doc = branchedDoc()
    const rows = outline(doc, buildIndex(doc))
    const lost = rows.find(row => row.stepId === 'scr_lost')
    expect(lost?.group).toBe('unconnected')
    expect(lost?.terminal).toBe(true)
    expect(rows.find(row => row.stepId === 'scr_quiz')?.terminal).toBe(false)
  })
})
