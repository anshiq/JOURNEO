const RESERVED = new Set(['embed', 'fixture', 'screen', 'test', 'bp'])

export function linkParams(search: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of new URLSearchParams(search)) {
    if (RESERVED.has(key) || !value) continue
    const name = key.toLowerCase().startsWith('utm_') ? key.toLowerCase() : `param.${key}`
    out[name.slice(0, 40)] = value.slice(0, 250)
  }
  return out
}

export function utmOnly(params: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(params).filter(([k]) => k.startsWith('utm_') || k.startsWith('param.')))
}

export function withLinkParams(url: string, vars: Record<string, unknown>): string {
  try {
    const target = new URL(url)
    for (const [key, value] of Object.entries(vars)) {
      if (typeof value !== 'string') continue
      if (key.startsWith('utm_')) target.searchParams.set(key, value)
      else if (key.startsWith('param.')) target.searchParams.set(key.slice(6), value)
    }
    return target.toString()
  } catch {
    return url
  }
}
