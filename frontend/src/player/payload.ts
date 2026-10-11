import type { JourneyDoc } from '@journey/model/types'

export interface PlayerPayload {
  mode: 'live' | 'test'
  campaign?: { id: string; name: string; slug: string }
  versionId?: string | null
  doc: JourneyDoc | null
  ended?: { kind: 'message' | 'redirect'; message?: string; url?: string } | null
  notFound?: boolean
  revision?: number
  hash?: string
}

export function readInlinePayload(): PlayerPayload | null {
  const raw = document.getElementById('jx-doc')?.textContent
  if (!raw || raw.trim() === 'null') return null
  try {
    return JSON.parse(raw) as PlayerPayload
  } catch {
    return null
  }
}
