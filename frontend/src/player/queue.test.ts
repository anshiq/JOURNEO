import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { sendEvents } from './api'
import { createQueue } from './queue'

vi.mock('./api', () => ({
  sendEvents: vi.fn(),
  beaconEvents: vi.fn(() => false),
}))

const SESSION = 'ses_test0001'
const KEY = `journeo:pending:${SESSION}`

describe('createQueue offline persistence', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    vi.mocked(sendEvents).mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('keeps unsent events across a reload and sends them once', async () => {
    vi.mocked(sendEvents).mockRejectedValue(new Error('offline'))
    const first = createQueue(SESSION, 2000)
    first.push({ type: 'answer', element: 'el_a' })
    expect(JSON.parse(localStorage.getItem(KEY) ?? '[]')).toHaveLength(1)
    first.dispose()

    vi.mocked(sendEvents).mockResolvedValue({ accepted: 1 })
    const second = createQueue(SESSION, 2000)
    await vi.advanceTimersByTimeAsync(2000)
    expect(sendEvents).toHaveBeenCalledTimes(1)
    expect(vi.mocked(sendEvents).mock.calls[0]?.[1]).toHaveLength(1)
    expect(localStorage.getItem(KEY)).toBeNull()
    second.dispose()
  })

  test('drops events older than 24 hours when restoring', async () => {
    const stale = { seq: 1, type: 'view', clientTs: new Date(Date.now() - 25 * 3600_000).toISOString() }
    const fresh = { seq: 2, type: 'view', clientTs: new Date().toISOString() }
    localStorage.setItem(KEY, JSON.stringify([stale, fresh]))
    vi.mocked(sendEvents).mockResolvedValue({ accepted: 1 })
    const queue = createQueue(SESSION, 2000)
    await queue.flush()
    expect(vi.mocked(sendEvents).mock.calls[0]?.[1]).toEqual([fresh])
    queue.dispose()
  })

  test('retries as soon as the browser comes back online', async () => {
    vi.mocked(sendEvents).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ accepted: 1 })
    const queue = createQueue(SESSION, 2000)
    queue.push({ type: 'view' })
    await vi.advanceTimersByTimeAsync(2000)
    expect(sendEvents).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(0)
    expect(sendEvents).toHaveBeenCalledTimes(2)
    expect(localStorage.getItem(KEY)).toBeNull()
    queue.dispose()
  })
})
