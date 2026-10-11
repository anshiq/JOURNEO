import { parseRichText, type RichInline } from '@journey/richtext/parse'
import { serializeRichText, serializeSpans } from '@journey/richtext/serialize'
import fc from 'fast-check'
import { describe, expect, test } from 'vitest'
import { jsonToRich, richToJson } from '../canvas/tiptap'

const word = fc.string({
  unit: fc.constantFrom('a', 'b', ' ', '-', '*', '_', '[', ']', '1', '.'),
  minLength: 1,
  maxLength: 10,
})
const span: fc.Arbitrary<RichInline> = fc.oneof(
  fc.record({ type: fc.constant('text' as const), text: word, bold: fc.boolean(), italic: fc.boolean() }),
  fc.record({
    type: fc.constant('link' as const),
    href: fc.constant('https://example.com/x'),
    label: word,
    bold: fc.boolean(),
    italic: fc.boolean(),
  }),
  fc.record({
    type: fc.constant('token' as const),
    name: fc.constantFrom('name', 'email'),
    fallback: fc.constantFrom('', 'there'),
  }),
)
const filled = (spans: RichInline[]) => serializeSpans(spans).trim() !== ''
const roundTrip = (markdown: string) => serializeRichText(jsonToRich(richToJson(parseRichText(markdown), 'block')))
const plainText = (markdown: string) =>
  parseRichText(markdown)
    .flatMap(block => (block.type === 'paragraph' ? [block.spans] : block.items.map(item => item.spans)))
    .flat()
    .map(item => (item.type === 'text' ? item.text : item.type === 'link' ? item.label : `{{${item.name}}}`))
    .join('')

describe('inline editor conversion', () => {
  test('block text survives the editor round trip', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.record({
              type: fc.constant('paragraph' as const),
              spans: fc.array(span, { minLength: 1, maxLength: 4 }).filter(filled),
            }),
            fc.record({
              type: fc.constant('list' as const),
              style: fc.constantFrom('bullet', 'check', 'number') as fc.Arbitrary<'bullet' | 'check' | 'number'>,
              items: fc.array(fc.record({ spans: fc.array(span, { minLength: 1, maxLength: 3 }).filter(filled) }), {
                minLength: 1,
                maxLength: 3,
              }),
            }),
          ),
          { minLength: 1, maxLength: 3 },
        ),
        blocks => {
          const markdown = serializeRichText(parseRichText(serializeRichText(blocks)))
          const back = roundTrip(markdown)
          expect(roundTrip(back)).toBe(back)
          expect(plainText(back)).toBe(plainText(markdown))
        },
      ),
      { numRuns: 300 },
    )
  })

  test('headings stay on one line', () => {
    const json = richToJson(parseRichText('Hello **there**\n\n- a list'), 'inline')
    expect(json.content).toHaveLength(1)
    expect(serializeRichText(jsonToRich(json))).toBe('Hello **there** a list')
  })

  test('personalization chips keep their fallback', () => {
    const json = richToJson(parseRichText('Hi {{name|there}}!'), 'inline')
    expect(serializeRichText(jsonToRich(json))).toBe('Hi {{name|there}}!')
  })
})
