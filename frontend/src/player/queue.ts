import { beaconEvents, type QueuedEvent, sendEvents } from './api'

export type EventInput = Omit<QueuedEvent, 'seq' | 'clientTs'>

export interface EventQueue {
  push: (event: EventInput) => void
  flush: () => Promise<void>
  dispose: () => void
}

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

export function createQueue(sessionId: string, interval = 2000): EventQueue {
  let seq = readSeq(sessionId)
  let pending: QueuedEvent[] = []
  let timer: number | undefined
  let inflight = false
  let backoff = 2000

  const schedule = (ms: number) => {
    if (timer === undefined) timer = window.setTimeout(() => void flush(), ms)
  }

  const flush = async (): Promise<void> => {
    window.clearTimeout(timer)
    timer = undefined
    if (inflight || pending.length === 0) return
    inflight = true
    const batch = pending.slice(0, 50)
    try {
      await sendEvents(sessionId, batch)
      pending = pending.slice(batch.length)
      backoff = 2000
      if (pending.length > 0) schedule(0)
    } catch {
      backoff = Math.min(backoff * 2, 30000)
      schedule(backoff)
    } finally {
      inflight = false
    }
  }

  const onHide = () => {
    if (document.visibilityState === 'hidden' && pending.length > 0) {
      const batch = pending.slice(0, 50)
      if (beaconEvents(sessionId, batch)) pending = pending.slice(batch.length)
    }
  }
  document.addEventListener('visibilitychange', onHide)
  window.addEventListener('pagehide', onHide)

  return {
    push(event) {
      seq += 1
      writeSeq(sessionId, seq)
      pending.push({ ...event, seq, clientTs: new Date().toISOString() })
      schedule(interval)
    },
    flush,
    dispose() {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
      window.clearTimeout(timer)
    },
  }
}
