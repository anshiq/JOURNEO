import type { JourneyDoc } from '@journey/model/types'
import { ProblemError } from '@shared/api/problem'
import { beacon, getJson, postJson } from '@shared/api/public-client'
import { API_BASE } from '@shared/env'
import type { PlayerPayload } from './payload'

export interface QueuedEvent {
  seq: number
  type: string
  step?: string | undefined
  element?: string | undefined
  port?: string | undefined
  payload?: Record<string, unknown> | undefined
  clientTs: string
}

export function fetchLive(slug: string): Promise<PlayerPayload> {
  return getJson<PlayerPayload>(`/campaigns/${encodeURIComponent(slug)}`)
}

export async function fetchDev(
  token: string,
  etag?: string,
): Promise<{ payload: PlayerPayload | null; etag: string | null }> {
  const response = await fetch(`${API_BASE}/api/v1/public/dev/${encodeURIComponent(token)}`, {
    headers: etag ? { 'If-None-Match': etag } : {},
  })
  if (response.status === 304) return { payload: null, etag: etag ?? null }
  if (!response.ok) throw new Error(`dev ${response.status}`)
  return { payload: (await response.json()) as PlayerPayload, etag: response.headers.get('etag') }
}

export function startSession(body: {
  id: string
  campaignId: string
  versionId?: string | null
  devToken?: string | null
  device: string
  utm: Record<string, string>
  referrer: string | null
  locale: string
}): Promise<{ id: string; versionId: string | null; isTest: boolean }> {
  return postJson('/sessions', body)
}

export function sendEvents(sessionId: string, events: QueuedEvent[]): Promise<{ accepted: number }> {
  return postJson(`/sessions/${sessionId}/events`, { events })
}

export function beaconEvents(sessionId: string, events: QueuedEvent[]): boolean {
  return beacon(`/sessions/${sessionId}/events`, { events })
}

export async function submitLead(
  sessionId: string,
  body: { stepId: string; elementId: string; answers: Record<string, unknown>; hp?: string },
): Promise<{ ok: boolean; fields?: Record<string, string>; message?: string }> {
  try {
    await postJson(`/sessions/${sessionId}/submit`, body)
    return { ok: true }
  } catch (error) {
    if (error instanceof ProblemError && (error.status === 422 || error.status === 409)) {
      return {
        ok: false,
        fields: (error.problem.fields as Record<string, string> | undefined) ?? {},
        message: error.problem.detail,
      }
    }
    throw error
  }
}

export function ask(sessionId: string, question: string, stepId: string) {
  return postJson<{
    answer: string
    citations: { title: string; url?: string | null }[]
    fallback: boolean
    cta: { label: string; target: string } | null
  }>(`/sessions/${sessionId}/assist`, { question, stepId })
}

export type { JourneyDoc }
