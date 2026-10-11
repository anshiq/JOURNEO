import type { Vars } from '@journey/engine/index'
import { resolvePersonalization } from '@journey/personalize'
import { isSafeHref, parseRichText, type RichInline } from '@journey/richtext/parse'
import type { ReactNode } from 'react'
import * as s from '../styles/elements.css'

function stringify(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.map(stringify).join(', ')
  return typeof value === 'object' ? '' : String(value)
}

function renderSpan(span: RichInline, key: number, vars: Vars, labels: Record<string, string>): ReactNode {
  if (span.type === 'token') {
    const raw = vars[span.name]
    const value = typeof raw === 'string' && labels[raw] ? labels[raw] : stringify(raw)
    return <span key={key}>{value || span.fallback}</span>
  }
  const wrap = (node: ReactNode) => {
    let out = node
    if (span.italic) out = <em>{out}</em>
    if (span.bold) out = <strong>{out}</strong>
    return <span key={key}>{out}</span>
  }
  if (span.type === 'link') {
    if (!isSafeHref(span.href)) return wrap(span.label)
    return wrap(
      <a href={span.href} target="_blank" rel="noopener noreferrer nofollow">
        {span.label}
      </a>,
    )
  }
  return wrap(span.text.split('\n').flatMap((line, i) => (i === 0 ? [line] : [<br key={`br${i}`} />, line])))
}

export function RichText({
  text,
  vars,
  labels = {},
  listStyle,
  inline = false,
}: {
  text: string
  vars: Vars
  labels?: Record<string, string>
  listStyle?: 'bullet' | 'check' | 'number' | null | undefined
  inline?: boolean
}) {
  const blocks = parseRichText(text)
  if (inline) {
    const spans = blocks.flatMap(block =>
      block.type === 'paragraph' ? block.spans : block.items.flatMap(i => i.spans),
    )
    return <>{spans.map((span, i) => renderSpan(span, i, vars, labels))}</>
  }
  if (listStyle && blocks.every(block => block.type === 'paragraph')) {
    const lines = text.split('\n').filter(line => line.trim())
    const items = lines.map((line, i) => (
      <li key={`${i}:${line}`}>
        <RichText text={line} vars={vars} labels={labels} inline />
      </li>
    ))
    if (listStyle === 'number') return <ol>{items}</ol>
    return <ul className={listStyle === 'check' ? s.checkList : undefined}>{items}</ul>
  }
  return (
    <div className={s.richText}>
      {blocks.map((block, index) => {
        const key = `${index}:${block.type}`
        if (block.type === 'paragraph')
          return <p key={key}>{block.spans.map((span, i) => renderSpan(span, i, vars, labels))}</p>
        const items = block.items.map((item, i) => (
          <li key={`${key}:${i}`}>{item.spans.map((span, j) => renderSpan(span, j, vars, labels))}</li>
        ))
        if (block.style === 'number') return <ol key={key}>{items}</ol>
        return (
          <ul key={key} className={block.style === 'check' ? s.checkList : undefined}>
            {items}
          </ul>
        )
      })}
    </div>
  )
}

export function personalizeText(text: string, vars: Vars): string {
  return resolvePersonalization(text, vars)
}
