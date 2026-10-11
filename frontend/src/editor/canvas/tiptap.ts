import type { RichBlock, RichDoc, RichInline } from '@journey/richtext/parse'
import { Extension, mergeAttributes, Node } from '@tiptap/core'
import type { JSONContent } from '@tiptap/react'

export const InlineDocument = Node.create({ name: 'doc', topNode: true, content: 'paragraph' })

export const CheckListAttribute = Extension.create({
  name: 'checkListAttribute',
  addGlobalAttributes() {
    return [
      {
        types: ['bulletList'],
        attributes: {
          check: {
            default: false,
            parseHTML: element => element.hasAttribute('data-check'),
            renderHTML: attributes => (attributes.check ? { 'data-check': '' } : {}),
          },
        },
      },
    ]
  },
})

export const TokenNode = Node.create({
  name: 'token',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      name: { default: '' },
      fallback: { default: '' },
    }
  },
  parseHTML() {
    return [
      {
        tag: 'span[data-token]',
        getAttrs: element => ({
          name: element.getAttribute('data-name') ?? '',
          fallback: element.getAttribute('data-fallback') ?? '',
        }),
      },
    ]
  },
  renderHTML({ node, HTMLAttributes }) {
    const name = String(node.attrs.name ?? '')
    const fallback = String(node.attrs.fallback ?? '')
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-token': '',
        'data-name': name,
        'data-fallback': fallback,
        class: 'rounded bg-indigo-100 px-1 text-indigo-800 text-[0.85em]',
        contenteditable: 'false',
      }),
      fallback ? `${tokenLabel(name)} · if empty: ${fallback}` : tokenLabel(name),
    ]
  },
  renderText({ node }) {
    return `{{${String(node.attrs.name ?? '')}}}`
  },
})

function tokenLabel(name: string): string {
  const spaced = name.replace(/[_.]+/g, ' ').trim()
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : 'Answer'
}

function inlineToJson(spans: RichInline[]): JSONContent[] {
  const out: JSONContent[] = []
  for (const span of spans) {
    if (span.type === 'token') {
      out.push({ type: 'token', attrs: { name: span.name, fallback: span.fallback } })
      continue
    }
    const marks: JSONContent['marks'] = []
    if (span.bold) marks.push({ type: 'bold' })
    if (span.italic) marks.push({ type: 'italic' })
    if (span.type === 'link') marks.push({ type: 'link', attrs: { href: span.href } })
    const text = span.type === 'link' ? span.label : span.text
    text.split('\n').forEach((part, index) => {
      if (index > 0) out.push({ type: 'hardBreak' })
      if (part) out.push({ type: 'text', text: part, ...(marks.length ? { marks } : {}) })
    })
  }
  return out
}

function paragraph(spans: RichInline[]): JSONContent {
  const content = inlineToJson(spans)
  return content.length ? { type: 'paragraph', content } : { type: 'paragraph' }
}

export function richToJson(doc: RichDoc, mode: 'inline' | 'block'): JSONContent {
  if (mode === 'inline') {
    const spans = doc.flatMap((block, index) => {
      const own = block.type === 'paragraph' ? block.spans : block.items.flatMap(item => item.spans)
      return index > 0 ? [{ type: 'text', text: ' ', bold: false, italic: false } as RichInline, ...own] : own
    })
    return { type: 'doc', content: [paragraph(spans)] }
  }
  const content: JSONContent[] = doc.map(block => {
    if (block.type === 'paragraph') return paragraph(block.spans)
    const items = block.items.map(item => ({ type: 'listItem', content: [paragraph(item.spans)] }))
    if (block.style === 'number') return { type: 'orderedList', content: items }
    return { type: 'bulletList', attrs: { check: block.style === 'check' }, content: items }
  })
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}

function jsonToInline(nodes: JSONContent[] | undefined): RichInline[] {
  const out: RichInline[] = []
  for (const node of nodes ?? []) {
    if (node.type === 'hardBreak') {
      out.push({ type: 'text', text: '\n', bold: false, italic: false })
      continue
    }
    if (node.type === 'token') {
      out.push({ type: 'token', name: String(node.attrs?.name ?? ''), fallback: String(node.attrs?.fallback ?? '') })
      continue
    }
    if (node.type !== 'text' || !node.text) continue
    const marks = node.marks ?? []
    const bold = marks.some(mark => mark.type === 'bold')
    const italic = marks.some(mark => mark.type === 'italic')
    const link = marks.find(mark => mark.type === 'link')
    const href = typeof link?.attrs?.href === 'string' ? link.attrs.href : ''
    const previous = out.at(-1)
    if (link && href) {
      if (previous?.type === 'link' && previous.href === href && previous.bold === bold && previous.italic === italic)
        previous.label += node.text
      else out.push({ type: 'link', href, label: node.text, bold, italic })
    } else if (previous?.type === 'text' && previous.bold === bold && previous.italic === italic) {
      previous.text += node.text
    } else {
      out.push({ type: 'text', text: node.text, bold, italic })
    }
  }
  return out
}

export function jsonToRich(json: JSONContent): RichDoc {
  const blocks: RichBlock[] = []
  for (const node of json.content ?? []) {
    if (node.type === 'paragraph') {
      blocks.push({ type: 'paragraph', spans: jsonToInline(node.content) })
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      const style = node.type === 'orderedList' ? 'number' : node.attrs?.check ? 'check' : 'bullet'
      blocks.push({
        type: 'list',
        style,
        items: (node.content ?? []).map(item => ({
          spans: (item.content ?? []).flatMap((child, index) => {
            const spans = jsonToInline(child.content)
            return index > 0
              ? [{ type: 'text', text: '\n', bold: false, italic: false } as RichInline, ...spans]
              : spans
          }),
        })),
      })
    }
  }
  while (blocks.length > 1) {
    const last = blocks.at(-1)
    if (last?.type === 'paragraph' && last.spans.length === 0) blocks.pop()
    else break
  }
  return blocks
}
