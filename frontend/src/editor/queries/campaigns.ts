import { api } from '@shared/api/editor-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CampaignSummary, Goal, Workspace } from './types'

export const keys = {
  campaigns: ['campaigns'] as const,
  campaign: (id: string) => ['campaign', id] as const,
  journey: (id: string) => ['journey', id] as const,
  versions: (id: string) => ['versions', id] as const,
  checkpoints: (id: string) => ['checkpoints', id] as const,
  leads: (id: string) => ['leads', id] as const,
  results: (id: string, range: string) => ['results', id, range] as const,
  sources: (id: string) => ['sources', id] as const,
  templates: ['templates'] as const,
  recipes: ['recipes'] as const,
  presets: ['presets'] as const,
  stock: (q: string) => ['stock', q] as const,
}

export function useCampaigns() {
  return useQuery({
    queryKey: keys.campaigns,
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/campaigns', { params: { query: { limit: 100 } } })
      return (data as unknown as { items: CampaignSummary[] }).items
    },
  })
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: keys.campaign(id),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/campaigns/{campaign_id}', { params: { path: { campaign_id: id } } })
      return data as unknown as CampaignSummary
    },
  })
}

export function useWorkspace(id: string) {
  return useQuery({
    queryKey: keys.journey(id),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/campaigns/{campaign_id}/journey', {
        params: { path: { campaign_id: id } },
      })
      return data as unknown as Workspace
    },
  })
}

export interface CreateCampaignBody {
  name?: string
  brief?: string
  goal?: Goal
  websiteUrl?: string
  audience?: string
  tone?: string
  brand?: { logoFileKey?: string; color?: string }
  start: { mode: 'blank' | 'template' | 'ai'; templateId?: string }
}

export function useCreateCampaign() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateCampaignBody) => {
      const { data } = await api.POST('/api/v1/campaigns', { body: body as never })
      return data as unknown as { campaign: CampaignSummary; generationJobId: string | null }
    },
    onSuccess: () => client.invalidateQueries({ queryKey: keys.campaigns }),
  })
}

export function useUpdateCampaign(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name?: string; slug?: string; archived?: boolean }) => {
      const { data } = await api.PATCH('/api/v1/campaigns/{campaign_id}', {
        params: { path: { campaign_id: id } },
        body: body as never,
      })
      return data as unknown as CampaignSummary
    },
    onSuccess: campaign => {
      client.setQueryData(keys.campaign(id), campaign)
      void client.invalidateQueries({ queryKey: keys.campaigns })
    },
  })
}

export function useDeleteCampaign() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.DELETE('/api/v1/campaigns/{campaign_id}', { params: { path: { campaign_id: id } } })
    },
    onSuccess: () => client.invalidateQueries({ queryKey: keys.campaigns }),
  })
}

export function useDuplicateCampaign() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.POST('/api/v1/campaigns/{campaign_id}/duplicate', {
        params: { path: { campaign_id: id } },
      })
      return (data as unknown as { campaign: CampaignSummary }).campaign
    },
    onSuccess: () => client.invalidateQueries({ queryKey: keys.campaigns }),
  })
}

export function useSaveAsTemplate(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.POST('/api/v1/campaigns/{campaign_id}/save-as-template', {
        params: { path: { campaign_id: id } },
        body: { name } as never,
      })
      return data as unknown as { templateId: string }
    },
    onSuccess: () => client.invalidateQueries({ queryKey: keys.templates }),
  })
}

export async function slugAvailable(id: string, slug: string) {
  const { data } = await api.GET('/api/v1/campaigns/{campaign_id}/slug-available', {
    params: { path: { campaign_id: id }, query: { slug } },
  })
  return data as unknown as { available: boolean; valid: boolean; suggestion: string | null }
}

export async function resetPreviewLink(id: string) {
  const { data } = await api.POST('/api/v1/campaigns/{campaign_id}/preview-link/reset', {
    params: { path: { campaign_id: id } },
  })
  return data as unknown as { previewUrl: string }
}
