const RESUME_MS = 30 * 60 * 1000

interface StoredSession {
  id: string
  versionId: string | null
  updatedAt: number
}

function storageKey(campaignId: string): string {
  return `journeo:session:${campaignId}`
}

function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function resumeOrCreate(
  campaignId: string,
  versionId: string | null,
  now = Date.now(),
): { id: string; resumed: boolean } {
  try {
    const raw = localStorage.getItem(storageKey(campaignId))
    if (raw) {
      const stored = JSON.parse(raw) as StoredSession
      if (now - stored.updatedAt < RESUME_MS && stored.versionId === versionId && typeof stored.id === 'string') {
        touch(campaignId, stored.id, versionId, now)
        return { id: stored.id, resumed: true }
      }
    }
  } catch {
    return { id: newId(), resumed: false }
  }
  const id = newId()
  touch(campaignId, id, versionId, now)
  return { id, resumed: false }
}

export function touch(campaignId: string, id: string, versionId: string | null, now = Date.now()): void {
  try {
    localStorage.setItem(storageKey(campaignId), JSON.stringify({ id, versionId, updatedAt: now }))
  } catch {
    return
  }
}

export { newId }
