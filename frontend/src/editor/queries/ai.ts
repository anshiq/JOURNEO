import type { Theme } from '@journey/model/types'
import { api } from '@shared/api/editor-client'
import { isProblem } from '@shared/api/problem'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { Goal } from './types'

export function aiFailureMessage(failure: unknown, fallback: string): string {
  if (isProblem(failure, 503)) return 'AI is not set up'
  if (isProblem(failure, 429)) return 'AI is busy. Try again in a moment.'
  if (isProblem(failure)) return failure.problem.detail
  return fallback
}

export type GenerationStatus = 'queued' | 'running' | 'done' | 'error' | 'cancelled'

export interface GenerationBrief {
  brief: string
  goal: Goal | string
  websiteUrl: string
  audience: string
  tone: string
}

export interface GenerationJob {
  jobId: string
  status: GenerationStatus
  stage: 'outline' | 'content' | 'done'
  outline: { screens: { title: string; recipe: string; ends: boolean }[] } | null
  screensDone: number
  fallbackScreens: string[]
  issues: unknown[]
  error: string | null
  brief: GenerationBrief
}

export const TERMINAL: readonly GenerationStatus[] = ['done', 'error', 'cancelled']

export function useGenerationJob(campaignId: string, jobId: string | null) {
  return useQuery({
    enabled: Boolean(jobId),
    queryKey: ['generation', campaignId, jobId],
    refetchOnWindowFocus: false,
    refetchInterval: query => {
      const status = query.state.data?.status
      return status && TERMINAL.includes(status) ? false : 1000
    },
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/campaigns/{campaign_id}/journey/generate/{job_id}', {
        params: { path: { campaign_id: campaignId, job_id: jobId ?? '' } },
      })
      return data as unknown as GenerationJob
    },
  })
}

export function useStartGeneration(campaignId: string) {
  return useMutation({
    mutationFn: async (body: Partial<GenerationBrief>) => {
      const { data } = await api.POST('/api/v1/campaigns/{campaign_id}/journey/generate', {
        params: { path: { campaign_id: campaignId } },
        body: body as never,
      })
      return data as unknown as { jobId: string }
    },
  })
}

export function useCancelGeneration(campaignId: string) {
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data } = await api.POST('/api/v1/campaigns/{campaign_id}/journey/generate/{job_id}/cancel', {
        params: { path: { campaign_id: campaignId, job_id: jobId } },
      })
      return data as unknown as { status: GenerationStatus; cancelRequested: boolean }
    },
  })
}

export function useRewrite() {
  return useMutation({
    mutationFn: async (input: { text: string; instruction: string; voice?: string; kind: string }) => {
      const { data } = await api.POST('/api/v1/ai/rewrite', { body: input as never })
      return (data as unknown as { suggestions: string[] }).suggestions
    },
  })
}

export function useRewriteScreen() {
  return useMutation({
    mutationFn: async (input: {
      texts: { id: string; text: string; limit: number }[]
      instruction: string
      voice?: string
    }) => {
      const { data } = await api.POST('/api/v1/ai/rewrite-screen', { body: input as never })
      return (data as unknown as { texts: Record<string, string> }).texts
    },
  })
}

export function useRestyle() {
  return useMutation({
    mutationFn: async (input: { prompt?: string; websiteUrl?: string }) => {
      const { data } = await api.POST('/api/v1/ai/theme', { body: input as never })
      return data as unknown as { theme: Partial<Theme>; signals: Record<string, string> }
    },
  })
}

export function useAltText() {
  return useMutation({
    mutationFn: async (url: string) => {
      const { data } = await api.POST('/api/v1/ai/alt-text', { body: { url } as never })
      return (data as unknown as { alt: string }).alt
    },
  })
}
