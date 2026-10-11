import { describe, expect, test } from 'vitest'
import type { JourneyDoc, Screen } from './model/types'
import { docSummary, elementLabel, plain, screenName } from './summary'

function screen(elements: NonNullable<Screen['elements']>, name = 'Named'): Screen {
  return { id: 'scr_test', name, elements }
}

describe('summary', () => {
  test('plain strips markdown and tokens and truncates', () => {
    expect(plain('Hello **bold**')).toBe('Hello bold')
    expect(plain('Hi {{first_name|there}}')).toBe('Hi')
    expect(plain('  spaced   out  ')).toBe('spaced out')
    expect(plain('123456789', 5)).toBe('1234…')
  })
  test('screenName prefers heading then question then name', () => {
    expect(screenName(screen([{ id: 'el_h', type: 'heading', props: { text: 'Welcome back' } }], 'Fallback'))).toBe(
      'Welcome back',
    )
    expect(
      screenName(
        screen([
          { id: 'el_t', type: 'text', props: { text: 'Body' } },
          { id: 'el_c', type: 'choice', props: { question: 'Pick one', key: 'k', options: [] } },
        ]),
      ),
    ).toBe('Pick one')
    expect(screenName(screen([]))).toBe('Named')
  })
  test('elementLabel describes every element kind', () => {
    const doc: JourneyDoc = { schemaVersion: 4, steps: [], screens: {} }
    expect(docSummary(doc)).toBe('0 screens: ')
    expect(elementLabel({ id: 'e', type: 'heading', props: { text: 'Hi' } })).toBe('Heading ‘Hi’')
    expect(elementLabel({ id: 'e', type: 'form', props: { fields: [] } })).toBe('Form')
  })
})
