import { API_BASE } from '../env'
import { toProblem } from './problem'

const base = `${API_BASE}/api/v1/public`

export async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, init)
  if (!response.ok) throw await toProblem(response)
  return (await response.json()) as T
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  })
  if (!response.ok) throw await toProblem(response)
  return (await response.json()) as T
}

export function beacon(path: string, body: unknown): boolean {
  if (typeof navigator === 'undefined' || !navigator.sendBeacon) return false
  return navigator.sendBeacon(`${base}${path}`, new Blob([JSON.stringify(body)], { type: 'text/plain' }))
}
