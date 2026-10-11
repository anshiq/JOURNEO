import { api } from '@shared/api/editor-client'
import { useQuery } from '@tanstack/react-query'
import { keys } from './campaigns'
import type { PresetItem, RecipeItem, StockImage, TemplateItem, UploadedImage } from './types'

export function useTemplates(enabled = true) {
  return useQuery({
    enabled,
    queryKey: keys.templates,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/library/templates')
      return (data as unknown as { items: TemplateItem[] }).items
    },
  })
}

export function useRecipes() {
  return useQuery({
    queryKey: keys.recipes,
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/library/recipes')
      return (data as unknown as { items: RecipeItem[] }).items
    },
  })
}

export function usePresets() {
  return useQuery({
    queryKey: keys.presets,
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/library/presets')
      return (data as unknown as { items: PresetItem[] }).items
    },
  })
}

export function useStockSearch(q: string) {
  return useQuery({
    enabled: q.trim().length > 1,
    queryKey: keys.stock(q.trim()),
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/media/search', { params: { query: { q: q.trim() } } })
      return (data as unknown as { items: StockImage[] }).items
    },
  })
}

export async function uploadImage(file: File): Promise<UploadedImage> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.POST('/api/v1/files', {
    body: form as never,
    bodySerializer: body => body as unknown as FormData,
  })
  return data as unknown as UploadedImage
}

export async function importImage(url: string): Promise<UploadedImage> {
  const { data } = await api.POST('/api/v1/files/import', { body: { url } as never })
  return data as unknown as UploadedImage
}
