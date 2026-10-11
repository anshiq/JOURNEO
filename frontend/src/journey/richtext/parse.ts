export type RichInline =
  | { type: 'text'; text: string; bold: boolean; italic: boolean }
  | { type: 'link'; href: string; label: string; bold: boolean; italic: boolean }
  | { type: 'token'; name: string; fallback: string }

export interface RichListItem {
  spans: RichInline[]
  checked?: boolean | undefined
}

export type RichBlock =
  | { type: 'paragraph'; spans: RichInline[] }
  | { type: 'list'; style: 'bullet' | 'check' | 'number'; items: RichListItem[] }

export type RichDoc = RichBlock[]

const LIST_RE = /^(\s{0,3})(\\?)(?:([-*•])\s+(?:\[([ xX])\]\s+)?|(\d+)[.)]\s+)([\s\S]*)$/

function findUnescaped(src: string, marker: string, from: number): number {
  let j = from
  while (j < src.length) {
    if (src[j] === '\\') {
      j += 2
      continue
    }
    if (src[j] === marker) return j
    if (src[j] === '\n') return -1
    j += 1
  }
  return -1
}

const SAFE_SCHEME = /^(https?:\/\/|mailto:|tel:)/i

export function isSafeHref(href: string): boolean {
  return SAFE_SCHEME.test(href.trim())
}

function unescapeInline(text: string): string {
  return text.replace(/\\([\\*_(){}[\]])/g, '$1')
}

function findCloser(src: string, marker: string, from: number): number {
  let j = from
  while (j < src.length) {
    if (src[j] === '\\') {
      j += 2
      continue
    }
    if (src.startsWith(marker, j)) return j
    j += 1
  }
  return -1
}

function parseSpans(src: string, bold: boolean, italic: boolean): RichInline[] {
  const spans: RichInline[] = []
  let text = ''
  const pushText = (): void => {
    if (!text) return
    const last = spans[spans.length - 1]
    if (last?.type === 'text' && last.bold === bold && last.italic === italic) {
      last.text += text
    } else {
      spans.push({ type: 'text', text, bold, italic })
    }
    text = ''
  }
  let i = 0
  while (i < src.length) {
    const ch = src[i] as string
    if (ch === '\\' && i + 1 < src.length && '\\*_(){}[]'.includes(src[i + 1] as string)) {
      text += src[i + 1]
      i += 2
      continue
    }
    if (src.startsWith('{{', i)) {
      let j = i + 2
      let end = -1
      while (j < src.length) {
        if (src[j] === '\\') {
          j += 2
          continue
        }
        if (src[j] === '}' && src[j + 1] === '}') {
          end = j
          break
        }
        j += 1
      }
      if (end === -1) {
        text += ch
        i += 1
        continue
      }
      pushText()
      const inner = src.slice(i + 2, end)
      let pipe = -1
      for (let k = 0; k < inner.length; k++) {
        if (inner[k] === '\\') {
          k += 1
          continue
        }
        if (inner[k] === '|') {
          pipe = k
          break
        }
      }
      const rawName = pipe === -1 ? inner : inner.slice(0, pipe)
      const rawFallback = pipe === -1 ? '' : inner.slice(pipe + 1)
      spans.push({
        type: 'token',
        name: unescapeInline(rawName).trim(),
        fallback: unescapeInline(rawFallback).trim(),
      })
      i = end + 2
      continue
    }
    if (ch === '[') {
      const close = findUnescaped(src, ']', i + 1)
      const urlOpen = close !== -1 ? close + 1 : -1
      const urlEnd = urlOpen !== -1 && src[urlOpen] === '(' ? findUnescaped(src, ')', urlOpen + 1) : -1
      const rawHref = urlEnd !== -1 ? src.slice(urlOpen + 1, urlEnd) : ''
      const href = rawHref.replace(/\\([()*_])/g, '$1')
      if (
        close !== -1 &&
        urlEnd !== -1 &&
        rawHref.length > 0 &&
        /^([^\s()]|\\[()*_])+$/.test(rawHref) &&
        isSafeHref(href)
      ) {
        pushText()
        spans.push({ type: 'link', href, label: unescapeInline(src.slice(i + 1, close)), bold, italic })
        i = urlEnd + 1
        continue
      }
      text += ch
      i += 1
      continue
    }
    if (src.startsWith('***', i)) {
      const end = findCloser(src, '***', i + 3)
      if (end === -1) {
        text += '***'
        i += 3
        continue
      }
      pushText()
      spans.push(...parseSpans(src.slice(i + 3, end), true, true))
      i = end + 3
      continue
    }
    if (src.startsWith('**', i)) {
      const end = findCloser(src, '**', i + 2)
      if (end === -1) {
        text += '**'
        i += 2
        continue
      }
      pushText()
      spans.push(...parseSpans(src.slice(i + 2, end), true, italic))
      i = end + 2
      continue
    }
    if (ch === '*' || ch === '_') {
      const end = findCloser(src, ch, i + 1)
      if (end === -1 || end === i + 1) {
        text += ch
        i += 1
        continue
      }
      pushText()
      spans.push(...parseSpans(src.slice(i + 1, end), bold, true))
      i = end + 1
      continue
    }
    text += ch
    i += 1
  }
  pushText()
  return spans
}

interface RawList {
  style: 'bullet' | 'check' | 'number'
  items: { raw: string; checked?: boolean }[]
}

export function parseRichText(text: string): RichDoc {
  const doc: RichDoc = []
  let paragraph: string[] = []
  let list: RawList | null = null
  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      doc.push({ type: 'paragraph', spans: parseSpans(paragraph.join('\n'), false, false) })
      paragraph = []
    }
  }
  const flushList = (): void => {
    if (list) {
      doc.push({
        type: 'list',
        style: list.style,
        items: list.items.map(item => ({ spans: parseSpans(item.raw, false, false), checked: item.checked })),
      })
      list = null
    }
  }
  for (const line of (text || '').split('\n')) {
    if (/^\s*$/.test(line)) {
      flushParagraph()
      flushList()
      continue
    }
    const listMatch = LIST_RE.exec(line)
    if (listMatch && !listMatch[2]) {
      flushParagraph()
      const checkState = listMatch[4] as string | undefined
      const style: RawList['style'] = checkState !== undefined ? 'check' : listMatch[5] ? 'number' : 'bullet'
      const raw = listMatch[6] as string
      const checked = checkState !== undefined ? checkState.toLowerCase() === 'x' : undefined
      if (!list || list.style !== style) {
        flushList()
        list = { style, items: [] }
      }
      ;(list as RawList).items.push(checked === undefined ? { raw } : { raw, checked })
      continue
    }
    if (listMatch) {
      const literal = listMatch[3] === '*' ? line : line.replace(/\\/, '')
      if (list) {
        const current = (list as RawList).items[(list as RawList).items.length - 1] as { raw: string }
        current.raw += `\n${literal.trim()}`
      } else {
        paragraph.push(literal)
      }
      continue
    }
    if (list) {
      const current = (list as RawList).items[(list as RawList).items.length - 1] as { raw: string }
      current.raw += `\n${line.trim()}`
      continue
    }
    paragraph.push(line)
  }
  flushParagraph()
  flushList()
  return doc
}
