import fc from 'fast-check'
import { describe, expect, test } from 'vitest'
import { resolveStyle } from '../../experience/responsive/resolve'
import { sequentialIds } from '../ids'
import type { JourneyDoc } from '../model/types'
import {
  addItem,
  addScreenAfter,
  deleteElement,
  deleteItem,
  deleteScreen,
  deleteStep,
  duplicateScreen,
  insertConditionOnLink,
  insertElement,
  invariantProblems,
  moveElement,
  moveScreenAfter,
  type Op,
  renameAnswer,
  setLink,
  setStyle,
} from './index'

function base(): JourneyDoc {
  return {
    schemaVersion: 4,
    steps: [
      { id: 'stp_start0', kind: 'start' },
      { id: 'scr_aaaaaa', kind: 'screen' },
      { id: 'scr_bbbbbb', kind: 'screen' },
    ],
    screens: {
      scr_aaaaaa: {
        id: 'scr_aaaaaa',
        name: 'A',
        elements: [
          {
            id: 'el_btns001',
            type: 'buttons',
            props: { items: [{ id: 'it_goto001', label: 'Go', action: { kind: 'goto' } }] },
          },
          {
            id: 'el_choice1',
            type: 'choice',
            props: { question: 'Budget?', key: 'budget', options: [{ id: 'opt_low001', label: 'Low' }] },
          },
        ],
      },
      scr_bbbbbb: {
        id: 'scr_bbbbbb',
        name: 'B',
        elements: [{ id: 'el_head001', type: 'heading', props: { text: 'Hi {{budget}}' } }],
      },
    },
    links: {
      stp_start0: { next: 'scr_aaaaaa' },
      scr_aaaaaa: { next: 'scr_bbbbbb', 'el_btns001:it_goto001': 'scr_bbbbbb' },
    },
  }
}

const run = (doc: JourneyDoc, op: Op, ids = sequentialIds()) => op(doc, ids)
const welcome = { name: 'New', elements: [{ type: 'heading', props: { text: 'New' } }] }

describe('screen ops', () => {
  test('adding after a screen splices it into the next chain', () => {
    const { doc, effects } = run(base(), addScreenAfter('scr_aaaaaa', welcome))
    const created = effects.select?.kind === 'screen' ? effects.select.screenId : ''
    expect(doc.links?.scr_aaaaaa?.next).toBe(created)
    expect(doc.links?.[created]?.next).toBe('scr_bbbbbb')
    expect(doc.steps?.map(s => s.id).indexOf(created)).toBe(2)
  })

  test('deleting a screen bridges next links and drops item links', () => {
    const { doc, effects } = run(base(), deleteScreen('scr_bbbbbb'))
    expect(doc.links?.scr_aaaaaa).toBeUndefined()
    expect(effects.removedLinks).toBe(2)
    expect(invariantProblems(doc)).toEqual([])
  })

  test('deleting a middle screen keeps the journey connected', () => {
    const { doc } = run(base(), deleteScreen('scr_aaaaaa'))
    expect(doc.links?.stp_start0?.next).toBe('scr_bbbbbb')
  })

  test('duplicate re-ids elements and keeps answer keys unique', () => {
    const { doc, effects } = run(base(), duplicateScreen('scr_aaaaaa'))
    const copy = effects.select?.kind === 'screen' ? doc.screens?.[effects.select.screenId] : undefined
    const choice = copy?.elements?.find(el => el.type === 'choice')
    expect(choice?.type === 'choice' && choice.props.key).toBe('budget_2')
    expect(invariantProblems(doc)).toEqual([])
  })

  test('moving a screen rewires only next links', () => {
    const start = run(base(), addScreenAfter('scr_bbbbbb', welcome))
    const created = start.effects.select?.kind === 'screen' ? start.effects.select.screenId : ''
    const { doc } = run(start.doc, moveScreenAfter(created, 'scr_aaaaaa'))
    expect(doc.links?.scr_aaaaaa?.next).toBe(created)
    expect(doc.links?.[created]?.next).toBe('scr_bbbbbb')
    expect(doc.links?.scr_bbbbbb?.next).toBeUndefined()
    expect(doc.links?.scr_aaaaaa?.['el_btns001:it_goto001']).toBe('scr_bbbbbb')
  })
})

describe('element and item ops', () => {
  test('deleting an element removes its port links', () => {
    const { doc } = run(base(), deleteElement('el_btns001'))
    expect(doc.links?.scr_aaaaaa).toEqual({ next: 'scr_bbbbbb' })
  })

  test('deleting an item removes its link', () => {
    const { doc } = run(base(), deleteItem('el_btns001', 'it_goto001'))
    expect(doc.links?.scr_aaaaaa?.['el_btns001:it_goto001']).toBeUndefined()
  })

  test('adding an option generates an id and export slug', () => {
    const { doc } = run(base(), addItem('el_choice1', { label: 'Très cher' }))
    const choice = doc.screens?.scr_aaaaaa?.elements?.[1]
    expect(choice?.type === 'choice' && choice.props.options.at(-1)).toMatchObject({
      label: 'Très cher',
      value: 'tres-cher',
    })
  })

  test('moving an element to another screen drops its links on the source', () => {
    const { doc } = run(base(), moveElement('el_btns001', 'scr_bbbbbb', 0))
    expect(doc.screens?.scr_bbbbbb?.elements?.[0]?.id).toBe('el_btns001')
    expect(doc.links?.scr_aaaaaa?.['el_btns001:it_goto001']).toBeUndefined()
  })

  test('inserted choices get unique keys', () => {
    const { doc } = run(
      base(),
      insertElement('scr_bbbbbb', 0, { type: 'choice', props: { question: 'Budget', options: [] } }),
    )
    const added = doc.screens?.scr_bbbbbb?.elements?.[0]
    expect(added?.type === 'choice' && added.props.key).toBe('budget_2')
  })
})

describe('style scopes', () => {
  test('mobile only keeps the previous value for larger screens', () => {
    const start = run(base(), setStyle('el_head001', 'align', 'left')).doc
    const { doc } = run(start, setStyle('el_head001', 'align', 'center', 'mobileOnly'))
    const el = doc.screens?.scr_bbbbbb?.elements?.[0]
    expect(el && resolveStyle(el, 'mobile').align).toBe('center')
    expect(el && resolveStyle(el, 'tablet').align).toBe('left')
    expect(el && resolveStyle(el, 'desktop').align).toBe('left')
  })

  test('all devices clears overrides', () => {
    let doc = run(base(), setStyle('el_head001', 'size', 'lg', 'desktopOnly')).doc
    doc = run(doc, setStyle('el_head001', 'size', 'sm', 'all')).doc
    const el = doc.screens?.scr_bbbbbb?.elements?.[0]
    expect(el?.responsive).toBeUndefined()
    expect(el && resolveStyle(el, 'desktop').size).toBe('sm')
  })
})

describe('logic ops', () => {
  test('inserting a condition keeps the old target as otherwise', () => {
    const { doc, effects } = run(base(), insertConditionOnLink('scr_aaaaaa', 'next'))
    const id = effects.select?.kind === 'step' ? effects.select.stepId : ''
    expect(doc.links?.scr_aaaaaa?.next).toBe(id)
    expect(doc.links?.[id]?.else).toBe('scr_bbbbbb')
    const removed = run(doc, deleteStep(id)).doc
    expect(removed.links?.scr_aaaaaa?.next).toBe('scr_bbbbbb')
  })

  test('renaming an answer rewrites tokens', () => {
    const { doc } = run(base(), renameAnswer('budget', 'price_range'))
    const heading = doc.screens?.scr_bbbbbb?.elements?.[0]
    expect(heading?.type === 'heading' && heading.props.text).toBe('Hi {{price_range}}')
  })
})

describe('invariants under random edits', () => {
  test('any sequence of ops keeps the document structurally valid', () => {
    const opFor = (code: number, doc: JourneyDoc): Op => {
      const screens = Object.keys(doc.screens ?? {})
      const pick = (n: number) => screens[n % Math.max(1, screens.length)] ?? 'scr_aaaaaa'
      const elements = Object.values(doc.screens ?? {}).flatMap(s => (s.elements ?? []).map(e => e.id))
      const element = elements[code % Math.max(1, elements.length)] ?? 'el_none00'
      switch (code % 8) {
        case 0:
          return addScreenAfter(pick(code), welcome)
        case 1:
          return deleteScreen(pick(code + 1))
        case 2:
          return duplicateScreen(pick(code))
        case 3:
          return moveScreenAfter(pick(code), pick(code + 3))
        case 4:
          return deleteElement(element)
        case 5:
          return setLink(pick(code), 'next', pick(code + 2))
        case 6:
          return insertConditionOnLink(pick(code), 'next')
        default:
          return moveElement(element, pick(code + 1), 0)
      }
    }
    fc.assert(
      fc.property(fc.array(fc.nat(1000), { maxLength: 25 }), codes => {
        const ids = sequentialIds()
        let doc = base()
        for (const code of codes) doc = opFor(code, doc)(doc, ids).doc
        expect(invariantProblems(doc)).toEqual([])
      }),
      { numRuns: 150 },
    )
  })
})
