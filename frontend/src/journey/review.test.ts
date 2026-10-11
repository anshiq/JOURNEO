import { describe, expect, test } from 'vitest'
import { exit, progressLabel, start, withParams } from './engine/index'
import type { JourneyDoc } from './model/types'
import { resolvePersonalization } from './personalize'
import { parseRichText } from './richtext/parse'

describe('rich text links', () => {
  test('unsafe schemes stay plain text', () => {
    const doc = parseRichText('[click](javascript:alert(1)) and [mail](mailto:a@b.co)')
    const spans = doc[0]?.type === 'paragraph' ? doc[0].spans : []
    expect(spans.filter(s => s.type === 'link').map(s => (s.type === 'link' ? s.href : ''))).toEqual(['mailto:a@b.co'])
  })
})

describe('personalization', () => {
  test('resolves link parameters with dots', () => {
    expect(resolvePersonalization('Hi {{param.ref|friend}}', { 'param.ref': 'Ana' })).toBe('Hi Ana')
    expect(resolvePersonalization('Hi {{ first_name | there }}', {})).toBe('Hi there')
  })
})

describe('redirect parameters', () => {
  test('keeps fragments and replaces existing values', () => {
    const url = withParams(
      { id: 'stp_redir1', kind: 'redirect', url: 'https://example.com/p?utm_source=old#top', passParams: true },
      { utm_source: 'ig', 'param.ref': 'x' },
    )
    expect(url).toBe('https://example.com/p?utm_source=ig&ref=x#top')
  })
})

function chain(): JourneyDoc {
  const screen = (id: string, next: boolean) => ({
    id,
    name: id,
    elements: next
      ? [
          {
            id: `el_${id}`,
            type: 'buttons' as const,
            props: { items: [{ id: `it_${id}`, label: 'Go', action: { kind: 'next' as const } }] },
          },
        ]
      : [{ id: `el_${id}`, type: 'heading' as const, props: { text: id } }],
  })
  return {
    schemaVersion: 4,
    steps: [
      { id: 'stp_start0', kind: 'start' },
      { id: 'scr_aaaaaa', kind: 'screen' },
      { id: 'scr_bbbbbb', kind: 'screen' },
      { id: 'scr_cccccc', kind: 'screen' },
      { id: 'scr_orphan', kind: 'screen' },
    ],
    screens: {
      scr_aaaaaa: screen('scr_aaaaaa', true),
      scr_bbbbbb: screen('scr_bbbbbb', true),
      scr_cccccc: screen('scr_cccccc', false),
      scr_orphan: screen('scr_orphan', false),
    },
    links: {
      stp_start0: { next: 'scr_aaaaaa' },
      scr_aaaaaa: { next: 'scr_bbbbbb' },
      scr_bbbbbb: { next: 'scr_cccccc' },
    },
  }
}

describe('progress label', () => {
  test('counts the remaining path, not every screen', () => {
    const doc = chain()
    const first = start(doc, { system: {} })
    expect(progressLabel(doc, first.state)).toBe('Step 1 of 3')
    const second = exit(doc, first.state, 'next', {})
    expect(progressLabel(doc, second.state)).toBe('Step 2 of 3')
  })

  test('exit events record the port that was actually taken', () => {
    const doc = chain()
    const first = start(doc, { system: {} })
    const second = exit(doc, first.state, 'next', {})
    expect(second.events[0]).toEqual({ type: 'exit', step: 'scr_aaaaaa', port: 'next' })
  })
})
