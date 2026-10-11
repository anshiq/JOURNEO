import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { parseSync } from 'oxc-parser'
import { describe, expect, test } from 'vitest'

const BANNED = [
  'node',
  'handle',
  'port',
  'blockKey',
  'payload',
  'schema',
  'variable',
  'override',
  'key',
  'utm',
  'persona',
  'iframe',
  'embed snippet',
  'dev link',
]
const VISIBLE_ATTRS = new Set([
  'label',
  'title',
  'placeholder',
  'aria-label',
  'hint',
  'description',
  'addLabel',
  'confirmLabel',
  'cancelLabel',
  'emptyLabel',
])
const VISIBLE_CALLS = new Set(['toast', 'success', 'error'])
const root = join(__dirname, '..')

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === 'test' ? [] : files(path)
    return path.endsWith('.tsx') || path.endsWith('.ts') ? [path] : []
  })
}

function visibleStrings(path: string): { text: string; line: number }[] {
  const source = readFileSync(path, 'utf8')
  const result = parseSync(path, source, { sourceType: 'module' })
  const out: { text: string; line: number }[] = []
  const line = (offset: number) => source.slice(0, offset).split('\n').length
  const literal = (node: Record<string, unknown> | null | undefined): string | null => {
    if (!node) return null
    if ((node.type === 'Literal' || node.type === 'StringLiteral') && typeof node.value === 'string') return node.value
    if (node.type === 'TemplateLiteral') {
      const quasis = node.quasis as { value: { cooked: string } }[]
      return quasis.map(q => q.value.cooked).join(' ')
    }
    return null
  }
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const child of node) walk(child)
      return
    }
    const n = node as Record<string, unknown>
    if (n.type === 'JSXText' && typeof n.value === 'string' && n.value.trim())
      out.push({ text: n.value, line: line(n.start as number) })
    if (n.type === 'JSXAttribute') {
      const name = (n.name as { name?: string } | undefined)?.name ?? ''
      if (VISIBLE_ATTRS.has(name)) {
        const value = n.value as Record<string, unknown> | null
        const text = literal(value) ?? literal(value?.expression as Record<string, unknown> | undefined)
        if (text) out.push({ text, line: line(n.start as number) })
      }
    }
    if (n.type === 'Property' || n.type === 'ObjectProperty') {
      const key = (n.key as { name?: string } | undefined)?.name ?? ''
      if (key === 'label' || key === 'title' || key === 'body' || key === 'hint' || key === 'message') {
        const text = literal(n.value as Record<string, unknown>)
        if (text) out.push({ text, line: line(n.start as number) })
      }
    }
    if (n.type === 'CallExpression') {
      const callee = n.callee as Record<string, unknown>
      const name = (callee.name as string | undefined) ?? (callee.property as { name?: string } | undefined)?.name ?? ''
      if (VISIBLE_CALLS.has(name)) {
        const text = literal((n.arguments as Record<string, unknown>[])[0])
        if (text) out.push({ text, line: line(n.start as number) })
      }
    }
    for (const [key, value] of Object.entries(n))
      if (key !== 'parent' && value && typeof value === 'object') walk(value)
  }
  walk(result.program)
  return out
}

describe('plain language', () => {
  test('creator-facing text avoids technical words', () => {
    const problems: string[] = []
    let scanned = 0
    for (const path of files(root)) {
      for (const { text, line } of visibleStrings(path)) {
        scanned += 1
        for (const word of BANNED) {
          const pattern = new RegExp(`\\b${word.replace(' ', '\\s+')}s?\\b`, 'i')
          const allowed = word === 'webhook' || (path.includes('SettingsDialog') && /webhook/i.test(text))
          if (pattern.test(text) && !allowed)
            problems.push(`${path.replace(root, 'editor')}:${line} “${text.trim()}” uses “${word}”`)
        }
      }
    }
    expect(scanned).toBeGreaterThan(300)
    expect(problems).toEqual([])
  })
})
