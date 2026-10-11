import fc from 'fast-check'
import { describe, expect, test } from 'vitest'
import { parseRichText, type RichDoc, type RichInline } from './richtext/parse'
import { serializeRichText, serializeSpans } from './richtext/serialize'

describe('richtext', () => {
  test('parses paragraphs, styles, links and tokens', () => {
    const doc = parseRichText('Hello **bold** and *italic*\n\n[Shop](https://example.com/shop) {{first_name|there}}')
    expect(doc).toHaveLength(2)
    expect(doc[0]).toEqual({
      type: 'paragraph',
      spans: [
        { type: 'text', text: 'Hello ', bold: false, italic: false },
        { type: 'text', text: 'bold', bold: true, italic: false },
        { type: 'text', text: ' and ', bold: false, italic: false },
        { type: 'text', text: 'italic', bold: false, italic: true },
      ],
    })
    expect(doc[1]).toEqual({
      type: 'paragraph',
      spans: [
        { type: 'link', href: 'https://example.com/shop', label: 'Shop', bold: false, italic: false },
        { type: 'text', text: ' ', bold: false, italic: false },
        { type: 'token', name: 'first_name', fallback: 'there' },
      ],
    })
  })
  test('parses bullet, check and number lists', () => {
    const doc = parseRichText('- one\n- two\n\n1. first\n2. second\n\n- [x] done\n- [ ] todo')
    expect(doc).toEqual([
      {
        type: 'list',
        style: 'bullet',
        items: [
          { spans: [{ type: 'text', text: 'one', bold: false, italic: false }] },
          { spans: [{ type: 'text', text: 'two', bold: false, italic: false }] },
        ],
      },
      {
        type: 'list',
        style: 'number',
        items: [
          { spans: [{ type: 'text', text: 'first', bold: false, italic: false }] },
          { spans: [{ type: 'text', text: 'second', bold: false, italic: false }] },
        ],
      },
      {
        type: 'list',
        style: 'check',
        items: [
          { spans: [{ type: 'text', text: 'done', bold: false, italic: false }], checked: true },
          { spans: [{ type: 'text', text: 'todo', bold: false, italic: false }], checked: false },
        ],
      },
    ])
  })
  test('unclosed markers stay literal', () => {
    const doc = parseRichText('a **bold and *italic')
    expect(doc).toEqual([
      { type: 'paragraph', spans: [{ type: 'text', text: 'a **bold and *italic', bold: false, italic: false }] },
    ])
  })
  test('escaped markers stay literal', () => {
    const doc = parseRichText('\\- not a list \\*star\\*')
    expect(doc).toEqual([
      { type: 'paragraph', spans: [{ type: 'text', text: '- not a list *star*', bold: false, italic: false }] },
    ])
  })
  test('parsed documents serialize idempotently', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 120 }), text => {
        const once = parseRichText(text)
        expect(parseRichText(serializeRichText(once))).toEqual(once)
      }),
    )
  })
  test('arbitrary documents survive a serialize round trip', () => {
    const word = fc.string({
      unit: fc.constantFrom('a', 'b', 'c', ' ', '-', '*', '_', '[', ']', '(', ')', '{', '}', '\\', '1', '.', '#'),
      minLength: 1,
      maxLength: 12,
    })
    const spanArb: fc.Arbitrary<RichInline> = fc.oneof(
      word.map(text => ({ type: 'text', text, bold: false, italic: false }) as RichInline),
      fc.record({ type: fc.constant('text' as const), text: word, bold: fc.boolean(), italic: fc.boolean() }),
      fc.record({
        type: fc.constant('link' as const),
        href: fc.webUrl(),
        label: word,
        bold: fc.boolean(),
        italic: fc.boolean(),
      }),
      fc.record({
        type: fc.constant('token' as const),
        name: fc.string({ unit: fc.constantFrom('a', 'b', '_'), minLength: 1, maxLength: 8 }),
        fallback: word,
      }),
    )
    const filled = (spans: RichInline[]) => serializeSpans(spans).trim() !== ''
    const blockArb = fc.oneof(
      fc.record({
        type: fc.constant('paragraph' as const),
        spans: fc.array(spanArb, { minLength: 1, maxLength: 4 }).filter(filled),
      }),
      fc.record({
        type: fc.constant('list' as const),
        style: fc.constantFrom('bullet', 'check', 'number') as fc.Arbitrary<'bullet' | 'check' | 'number'>,
        items: fc.array(
          fc.record({
            spans: fc.array(spanArb, { minLength: 1, maxLength: 3 }).filter(filled),
            checked: fc.option(fc.boolean()),
          }),
          { minLength: 1, maxLength: 3 },
        ),
      }),
    )
    fc.assert(
      fc.property(fc.array(blockArb, { maxLength: 4 }), blocks => {
        const markdown = serializeRichText(blocks as RichDoc)
        expect(serializeRichText(parseRichText(markdown))).toBe(markdown)
      }),
      { numRuns: 500 },
    )
  })
})
