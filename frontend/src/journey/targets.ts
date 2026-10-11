import type { JourneyDoc } from './model/types'
import { portsOf } from './ports'

export function resolveTarget(doc: JourneyDoc, stepId: string, port: string): string | null {
  const direct = doc.links?.[stepId]?.[port]
  if (direct) return direct
  const declared = portsOf(doc, stepId).find(p => p.port === port)
  if (declared?.fallback === 'next') return doc.links?.[stepId]?.next ?? null
  return null
}
