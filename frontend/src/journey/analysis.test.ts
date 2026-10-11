import { describe, expect, test } from 'vitest'
import { buildIndex } from './analysis'
import type { JourneyDoc } from './model/types'

function linearDoc(): JourneyDoc {
  return {
    schemaVersion: 4,
    steps: [
      { id: 'stp_start', kind: 'start' },
      { id: 'scr_first', kind: 'screen' },
      { id: 'scr_second', kind: 'screen' },
      { id: 'scr_lost', kind: 'screen' },
    ],
    screens: {
      scr_first: {
        id: 'scr_first',
        name: 'First',
        elements: [
          {
            id: 'el_btns',
            type: 'buttons',
            props: { items: [{ id: 'it_go', label: 'Go', action: { kind: 'next' } }] },
          },
        ],
      },
      scr_second: { id: 'scr_second', name: 'Second', elements: [] },
      scr_lost: { id: 'scr_lost', name: 'Lost', elements: [] },
    },
    links: { stp_start: { next: 'scr_first' }, scr_first: { next: 'scr_second' } },
  }
}

describe('analysis', () => {
  test('reachability excludes unconnected steps', () => {
    const index = buildIndex(linearDoc())
    expect(index.firstStep).toBe('stp_start')
    expect([...index.reachable].sort()).toEqual(['scr_first', 'scr_second', 'stp_start'])
  })
  test('distances count screens to a terminal', () => {
    const index = buildIndex(linearDoc())
    expect(index.minToEnd.scr_second).toBe(1)
    expect(index.minToEnd.scr_first).toBe(2)
  })
  test('answer availability flows forward only', () => {
    const doc = linearDoc()
    const first = doc.screens?.scr_first
    if (first?.elements?.[0]?.type === 'buttons') {
      first.elements = [
        {
          id: 'el_pick',
          type: 'choice',
          props: {
            question: 'Pick',
            key: 'tier',
            options: [{ id: 'opt_vip', label: 'VIP' }],
            autoAdvance: true,
          },
        },
      ]
    }
    const index = buildIndex(doc)
    expect([...(index.produced.scr_first ?? [])]).toEqual(['tier'])
    expect(index.may.scr_second).toContain('tier')
    expect(index.must.scr_second).toContain('tier')
    expect(index.may.scr_first).not.toContain('tier')
  })
  test('screen cycles are not logic loops but flag progress', () => {
    const doc = linearDoc()
    const second = doc.screens?.scr_second
    if (second) {
      second.elements = [
        {
          id: 'el_back',
          type: 'buttons',
          props: { items: [{ id: 'it_back', label: 'Back', action: { kind: 'next' } }] },
        },
      ]
    }
    doc.links = {
      stp_start: { next: 'scr_first' },
      scr_first: { next: 'scr_second' },
      scr_second: { next: 'scr_first' },
    }
    const index = buildIndex(doc)
    expect(index.hasReachableCycle).toBe(true)
    expect(index.sccs.some(comp => comp.length > 1)).toBe(true)
  })
  test('condition-only cycles are reachable', () => {
    const doc: JourneyDoc = {
      schemaVersion: 4,
      steps: [
        { id: 'stp_start', kind: 'start' },
        { id: 'scr_first', kind: 'screen' },
        { id: 'stp_loop1', kind: 'condition', rules: [] },
        { id: 'stp_loop2', kind: 'condition', rules: [] },
      ],
      screens: {
        scr_first: {
          id: 'scr_first',
          name: 'First',
          elements: [
            {
              id: 'el_go',
              type: 'buttons',
              props: { items: [{ id: 'it_go', label: 'Go', action: { kind: 'next' } }] },
            },
          ],
        },
      },
      links: {
        stp_start: { next: 'scr_first' },
        scr_first: { next: 'stp_loop1' },
        stp_loop1: { else: 'stp_loop2' },
        stp_loop2: { else: 'stp_loop1' },
      },
    }
    const index = buildIndex(doc)
    expect(index.hasReachableCycle).toBe(true)
  })
  test('dangling links are dropped from adjacency', () => {
    const doc = linearDoc()
    doc.links = { stp_start: { next: 'scr_first' }, scr_first: { next: 'scr_ghost' } }
    const index = buildIndex(doc)
    expect(index.adjacency.scr_first).toEqual([])
  })
})
