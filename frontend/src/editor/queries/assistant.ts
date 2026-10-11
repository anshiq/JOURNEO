import { api } from '@shared/api/editor-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keys } from './campaigns'
import type { ChatAnswer, KnowledgeSource } from './types'

export function useSources(id: string) {
  return useQuery({
    queryKey: keys.sources(id),
    refetchInterval: query =>
      (query.state.data as KnowledgeSource[] | undefined)?.some(source => source.status === 'pending') ? 2000 : false,
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/campaigns/{campaign_id}/knowledge/sources', {
        params: { path: { campaign_id: id } },
      })
      return (data as unknown as { items: KnowledgeSource[] }).items
    },
  })
}

export function useAddSource(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (
      body: { kind: 'url'; url: string; title?: string } | { kind: 'qa'; question: string; answer: string },
    ) => {
      const { data } = await api.POST('/api/v1/campaigns/{campaign_id}/knowledge/sources', {
        params: { path: { campaign_id: id } },
        body: body as never,
      })
      return (data as unknown as { source: KnowledgeSource }).source
    },
    onSuccess: () => client.invalidateQueries({ queryKey: keys.sources(id) }),
  })
}

export function useUploadPdf(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.POST('/api/v1/campaigns/{campaign_id}/knowledge/sources/pdf', {
        params: { path: { campaign_id: id } },
        body: form as never,
        bodySerializer: body => body as unknown as FormData,
      })
      return (data as unknown as { source: KnowledgeSource }).source
    },
    onSuccess: () => client.invalidateQueries({ queryKey: keys.sources(id) }),
  })
}

export function useRemoveSource(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (sourceId: string) => {
      await api.DELETE('/api/v1/campaigns/{campaign_id}/knowledge/sources/{source_id}', {
        params: { path: { campaign_id: id, source_id: sourceId } },
      })
    },
    onSuccess: () => client.invalidateQueries({ queryKey: keys.sources(id) }),
  })
}

export function useRetrySource(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (sourceId: string) => {
      await api.POST('/api/v1/campaigns/{campaign_id}/knowledge/sources/{source_id}/retry', {
        params: { path: { campaign_id: id, source_id: sourceId } },
      })
    },
    onSuccess: () => client.invalidateQueries({ queryKey: keys.sources(id) }),
  })
}

export function usePlayground(id: string) {
  return useMutation({
    mutationFn: async (question: string) => {
      const { data } = await api.POST('/api/v1/campaigns/{campaign_id}/knowledge/playground', {
        params: { path: { campaign_id: id } },
        body: { question } as never,
      })
      return data as unknown as ChatAnswer
    },
  })
}
