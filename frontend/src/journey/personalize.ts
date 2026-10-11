export type Vars = Record<string, unknown>

const TOKEN_PATTERN = /\{\{\s*([A-Za-z0-9_.]+)\s*(?:\|([^}]*))?\}\}/g

export interface PersonalizationToken {
  name: string
  fallback: string
}

export function extractTokens(text: string): PersonalizationToken[] {
  const tokens: PersonalizationToken[] = []
  TOKEN_PATTERN.lastIndex = 0
  for (;;) {
    const match = TOKEN_PATTERN.exec(text)
    if (match === null) return tokens
    tokens.push({ name: match[1] ?? '', fallback: (match[2] ?? '').trim() })
  }
}

function stringify(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(item => stringify(item) ?? '').join(', ')
  return null
}

export function resolvePersonalization(text: string, vars: Vars): string {
  return text.replace(TOKEN_PATTERN, (_match, name: string, fallback: string | undefined) => {
    const value = stringify(vars[name])
    if (value === null || value === '') return (fallback ?? '').trim()
    return value
  })
}
