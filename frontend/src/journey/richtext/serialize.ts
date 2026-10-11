import type { RichBlock, RichDoc, RichInline, RichListItem } from './parse'

const ESCAPE_RE = /([\\*_(){}[\]])/g
const LINE_MARKER_RE = /^\s{0,3}([-*•]\s+|\d+[.)]\s+)/

function escapeText(text: string): string {
  return text.replace(ESCAPE_RE, '\\$1')
}

function escapeTokenPart(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/([{}|])/g, '\\$1')
}

function wrapStyled(text: string, bold: boolean, italic: boolean): string {
  const edge = /^(\s*)([\s\S]*?)(\s*)$/.exec(text)
  const leading = edge?.[1] ?? ''
  const core = edge?.[2] ?? ''
  const trailing = edge?.[3] ?? ''
  if (!core) return text
  if (bold && italic) return `${leading}***${core}***${trailing}`
  if (bold) return `${leading}**${core}**${trailing}`
  if (italic) return `${leading}*${core}*${trailing}`
  return text
}

export function serializeSpans(spans: RichInline[]): string {
  return spans
    .map(span => {
      if (span.type === 'token') {
        const name = escapeTokenPart(span.name.trim())
        const fallback = escapeTokenPart(span.fallback.trim())
        return fallback ? `{{${name}|${fallback}}}` : `{{${name}}}`
      }
      if (span.type === 'link') {
        const href = span.href.replace(/[()*_]/g, '\\$&')
        return wrapStyled(`[${escapeText(span.label)}](${href})`, span.bold, span.italic)
      }
      return wrapStyled(escapeText(span.text), span.bold, span.italic)
    })
    .join('')
}

function escapeLineStart(line: string): string {
  return LINE_MARKER_RE.test(line) ? line.replace(/^(\s{0,3})/, '$1\\') : line
}

function serializeItem(item: RichListItem, marker: string, checkable: boolean): string {
  const text = serializeSpans(item.spans)
  const lines = text.split('\n')
  const head = (lines[0] ?? '').trimStart()
  const tail = lines.slice(1).map(line => `  ${escapeLineStart(line.trim())}`)
  const checked = checkable ? (item.checked ?? false) : undefined
  if (checked === undefined) return `${marker} ${head}${tail.length > 0 ? `\n${tail.join('\n')}` : ''}`
  return `${marker} [${checked ? 'x' : ' '}] ${head}${tail.length > 0 ? `\n${tail.join('\n')}` : ''}`
}

export function serializeBlock(block: RichBlock): string {
  if (block.type === 'paragraph') {
    return serializeSpans(block.spans).split('\n').map(escapeLineStart).join('\n')
  }
  const checkable =
    block.style === 'check' || block.items.some(item => item.checked !== undefined && item.checked !== null)
  return block.items
    .map((item, index) => {
      if (block.style === 'number') return serializeItem(item, `${index + 1}.`, false)
      return serializeItem(item, '-', checkable)
    })
    .join('\n')
}

export function serializeRichText(doc: RichDoc): string {
  return doc.map(serializeBlock).join('\n\n')
}
