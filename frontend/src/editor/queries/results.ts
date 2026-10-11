import { api } from '@shared/api/editor-client'
import { readEditorToken } from '@shared/api/token'
import { API_BASE } from '@shared/env'
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query'
import { keys } from './campaigns'
import type { LeadsPage, Results } from './types'

export function useLeads(id: string) {
  return useInfiniteQuery({
    queryKey: keys.leads(id),
    initialPageParam: null as string | null,
    getNextPageParam: (page: LeadsPage) => page.nextCursor,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.GET('/api/v1/campaigns/{campaign_id}/leads', {
        params: { path: { campaign_id: id }, query: { limit: 50, ...(pageParam ? { cursor: pageParam } : {}) } },
      })
      return data as unknown as LeadsPage
    },
  })
}

export function useResults(id: string, range: string) {
  return useQuery({
    queryKey: keys.results(id, range),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/campaigns/{campaign_id}/results', {
        params: { path: { campaign_id: id }, query: { range } as never },
      })
      return data as unknown as Results
    },
  })
}

export function useTestWebhook(id: string) {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.POST('/api/v1/campaigns/{campaign_id}/leads/test-webhook', {
        params: { path: { campaign_id: id } },
      })
      return data as unknown as { delivered: boolean; statusCode: number | null; error: string | null }
    },
  })
}

export async function downloadLeadsCsv(id: string, filename: string): Promise<void> {
  const token = readEditorToken()
  const response = await fetch(`${API_BASE}/api/v1/campaigns/${encodeURIComponent(id)}/leads.csv`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error('download failed')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
