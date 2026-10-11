import type { JourneyDoc } from '@journey/model/types'
import {
  addScreenAfter,
  deleteElement,
  duplicateScreen,
  insertElement,
  setTheme,
  updateElement,
  updateScreen,
} from '@journey/ops/index'
import fc from 'fast-check'
import { beforeEach, describe, expect, test } from 'vitest'
import template from '../../../../contracts/library/templates/lead-gen-launch.json'
import { useEditor } from '../store'

const start = template.doc as unknown as JourneyDoc

function reset() {
  useEditor.getState().load('cmp_test', start, 1, 'hash', null)
}

function command(code: number, doc: JourneyDoc) {
  const screens = Object.keys(doc.screens ?? {})
  const screenId = screens[code % screens.length] ?? ''
  const elements = doc.screens?.[screenId]?.elements ?? []
  const element = elements[code % Math.max(1, elements.length)]
  switch (code % 7) {
    case 0:
      return { label: 'Add screen', run: addScreenAfter(screenId, { name: 'New', elements: [] }) }
    case 1:
      return { label: 'Duplicate', run: duplicateScreen(screenId) }
    case 2:
      return element
        ? { label: 'Delete', run: deleteElement(element.id) }
        : { label: 'Insert', run: insertElement(screenId, 0, { type: 'spacer', props: { size: 'md' } }) }
    case 3:
      return { label: 'Insert', run: insertElement(screenId, 0, { type: 'heading', props: { text: `H${code}` } }) }
    case 4:
      return { label: 'Theme', run: setTheme(['radius'], ['none', 'sm', 'md', 'lg'][code % 4]), coalesceKey: 'theme' }
    case 5:
      return { label: 'Rename', run: updateScreen(screenId, ['name'], `S${code}`) }
    default:
      return element?.type === 'heading'
        ? {
            label: 'Edit',
            run: updateElement(element.id, ['props', 'text'], `T${code}`),
            coalesceKey: `text:${element.id}`,
          }
        : { label: 'Rename', run: updateScreen(screenId, ['name'], `R${code}`) }
  }
}

describe('editor store', () => {
  beforeEach(reset)

  test('undo walks back to the loaded document and redo replays to the latest', () => {
    fc.assert(
      fc.property(fc.array(fc.nat(500), { minLength: 1, maxLength: 20 }), codes => {
        reset()
        for (const code of codes) {
          const doc = useEditor.getState().doc as JourneyDoc
          useEditor.getState().dispatch(command(code, doc))
        }
        const latest = useEditor.getState().doc
        while (useEditor.getState().past.length) useEditor.getState().undo()
        expect(useEditor.getState().doc).toEqual(start)
        while (useEditor.getState().future.length) useEditor.getState().redo()
        expect(useEditor.getState().doc).toEqual(latest)
      }),
      { numRuns: 60 },
    )
  })

  test('typing in the same field within a second becomes one history entry', () => {
    const doc = useEditor.getState().doc as JourneyDoc
    const screenId = Object.keys(doc.screens ?? {})[0] ?? ''
    for (const name of ['W', 'We', 'Wel', 'Welc']) {
      useEditor
        .getState()
        .dispatch({ label: 'Rename', run: updateScreen(screenId, ['name'], name), coalesceKey: 'name' })
    }
    expect(useEditor.getState().past).toHaveLength(1)
    useEditor.getState().undo()
    expect(useEditor.getState().doc).toEqual(start)
  })

  test('a no-op command does not create history or mark the draft dirty', () => {
    useEditor.getState().dispatch({ label: 'Nothing', run: updateScreen('scr_missing', ['name'], 'x') })
    expect(useEditor.getState().past).toHaveLength(0)
    expect(useEditor.getState().status).toBe('clean')
  })

  test('undo restores the selection that was active before the change', () => {
    const doc = useEditor.getState().doc as JourneyDoc
    const screenId = Object.keys(doc.screens ?? {})[0] ?? ''
    useEditor.getState().select({ kind: 'screen', screenId })
    useEditor
      .getState()
      .dispatch({ label: 'Insert', run: insertElement(screenId, 0, { type: 'heading', props: { text: 'Hi' } }) })
    expect(useEditor.getState().selection.kind).toBe('element')
    useEditor.getState().undo()
    expect(useEditor.getState().selection).toEqual({ kind: 'screen', screenId })
  })

  test('loading the latest version after a conflict clears history', () => {
    const doc = useEditor.getState().doc as JourneyDoc
    const screenId = Object.keys(doc.screens ?? {})[0] ?? ''
    useEditor.getState().dispatch({ label: 'Rename', run: updateScreen(screenId, ['name'], 'Mine') })
    useEditor.getState().replaceDoc(start, 'conflict', 9, 'server')
    expect(useEditor.getState().past).toHaveLength(0)
    expect(useEditor.getState().revision).toBe(9)
    expect(useEditor.getState().status).toBe('clean')
  })
})
