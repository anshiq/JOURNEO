import { beaconEvents, type QueuedEvent, sendEvents } from './api'

export type EventInput = Omit<QueuedEvent, 'seq' | 'clientTs'>

export interface EventQueue {
  push: (event: EventInput) => void
  flush: () => Promise<void>
  dispose: () => void
}

const BATCH_SIZE = 50
const RETENTION_MS = 24 * 60 * 60 * 1000
const BASE_BACKOFF_MS = 2000
const MAX_BACKOFF_MS = 30000

function readSeq(sessionId: string): number {
  try {
    return Number(localStorage.getItem(`journeo:seq:${sessionId}`) ?? 0) || 0
  } catch {
    return 0
  }
}

function writeSeq(sessionId: string, seq: number): void {
  try {
    localStorage.setItem(`journeo:seq:${sessionId}`, String(seq))
  } catch {
    return
  }
}

function pendingKey(sessionId: string): string {
  return `journeo:pending:${sessionId}`
}

function isFresh(event: QueuedEvent, now: number): boolean {
  const created = Date.parse(event.clientTs)
  return Number.isFinite(created) && now - created <= RETENTION_MS
}

function readPending(sessionId: string): QueuedEvent[] {
  try {
    const raw = localStorage.getItem(pendingKey(sessionId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const now = Date.now()
    return (parsed as QueuedEvent[]).filter(event => isFresh(event, now))
  } catch {
    return []
  }
}

function writePending(sessionId: string, pending: QueuedEvent[]): void {
  try {
    if (pending.length === 0) localStorage.removeItem(pendingKey(sessionId))
    else localStorage.setItem(pendingKey(sessionId), JSON.stringify(pending))
  } catch {
    return
  }
}

export function createQueue(sessionId: string, interval = 2000): EventQueue {
  let seq = readSeq(sessionId)
  let pending = readPending(sessionId)
  let timer: number | undefined
  let inflight = false
  let backoff = BASE_BACKOFF_MS

  const schedule = (ms: number) => {
    if (timer === undefined) timer = window.setTimeout(() => void flush(), ms)
  }

  const flush = async (): Promise<void> => {
    window.clearTimeout(timer)
    timer = undefined
    if (inflight) return
    pending = pending.filter(event => isFresh(event, Date.now()))
    writePending(sessionId, pending)
    if (pending.length === 0) return
    inflight = true
    const batch = pending.slice(0, BATCH_SIZE)
    try {
      await sendEvents(sessionId, batch)
      pending = pending.slice(batch.length)
      writePending(sessionId, pending)
      backoff = BASE_BACKOFF_MS
      if (pending.length > 0) schedule(0)
    } catch {
      backoff = Math.min(backoff * 2, MAX_BACKOFF_MS)
      schedule(backoff)
    } finally {
      inflight = false
    }
  }

  const onHide = () => {
    if (document.visibilityState === 'hidden' && pending.length > 0) {
      const batch = pending.slice(0, BATCH_SIZE)
      if (beaconEvents(sessionId, batch)) {
        pending = pending.slice(batch.length)
        writePending(sessionId, pending)
      }
    }
  }

  const onOnline = () => {
    backoff = BASE_BACKOFF_MS
    void flush()
  }

  document.addEventListener('visibilitychange', onHide)
  window.addEventListener('pagehide', onHide)
  window.addEventListener('online', onOnline)
  if (pending.length > 0) schedule(interval)

  return {
    push(event) {
      seq += 1
      writeSeq(sessionId, seq)
      pending.push({ ...event, seq, clientTs: new Date().toISOString() })
      writePending(sessionId, pending)
      schedule(interval)
    },
    flush,
    dispose() {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('online', onOnline)
      window.clearTimeout(timer)
    },
  }
}
