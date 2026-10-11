import type { JourneyDoc } from '@journey/model/types'
import { api } from '@shared/api/editor-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keys } from './campaigns'
import type { CheckpointRow, EditorStateData, Issue, Ops, VersionRow, Workspace } from './types'

const path = (id: string) => ({ params: { path: { campaign_id: id } } })

export async function validateDoc(id: string, doc: JourneyDoc): Promise<Issue[]> {
  const { data } = await api.POST('/api/v1/campaigns/{campaign_id}/journey/validate', {
    ...path(id),
    body: { doc: doc as never },
  })
  return (data as unknown as { issues: Issue[] }).issues
}

export function usePublish(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: { revision: number; notes?: string }) => {
      const { data } = await api.POST('/api/v1/campaigns/{campaign_id}/journey/publish', {
        ...path(id),
        body: input as never,
      })
      return data as unknown as { versionNo: number; versionId: string; publishedAt: string; hash: string }
    },
    onSuccess: result => {
      client.setQueryData<Workspace>(keys.journey(id), current =>
        current
          ? {
              ...current,
              live: {
                versionNo: result.versionNo,
                versionId: result.versionId,
                publishedAt: result.publishedAt,
                hash: result.hash,
              },
            }
          : current,
      )
      void client.invalidateQueries({ queryKey: keys.versions(id) })
      void client.invalidateQueries({ queryKey: keys.campaigns })
    },
  })
}

export function useVersions(id: string, enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: keys.versions(id),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/campaigns/{campaign_id}/journey/versions', path(id))
      return (data as unknown as { items: VersionRow[] }).items
    },
  })
}

export function useCheckpoints(id: string, enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: keys.checkpoints(id),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/campaigns/{campaign_id}/journey/checkpoints', path(id))
      return (data as unknown as { items: CheckpointRow[] }).items
    },
  })
}

export async function fetchVersionDoc(id: string, versionNo: number): Promise<JourneyDoc> {
  const { data } = await api.GET('/api/v1/campaigns/{campaign_id}/journey/versions/{version_no}', {
    params: { path: { campaign_id: id, version_no: versionNo } },
  })
  return (data as unknown as { doc: JourneyDoc }).doc
}

export async function fetchCheckpointDoc(id: string, checkpointId: string): Promise<JourneyDoc> {
  const { data } = await api.GET('/api/v1/campaigns/{campaign_id}/journey/checkpoints/{checkpoint_id}', {
    params: { path: { campaign_id: id, checkpoint_id: checkpointId } },
  })
  return (data as unknown as { doc: JourneyDoc }).doc
}

export async function createCheckpoint(id: string, reason: 'manual' | 'ai_restyle' = 'manual'): Promise<void> {
  await api.POST('/api/v1/campaigns/{campaign_id}/journey/checkpoints', {
    ...path(id),
    body: { reason } as never,
  })
}

export async function restore(
  id: string,
  ref: { versionNo: number } | { checkpointId: string },
): Promise<{ revision: number; doc: JourneyDoc; hash: string }> {
  const { data } = await api.POST('/api/v1/campaigns/{campaign_id}/journey/restore', {
    ...path(id),
    body: ref as never,
  })
  return data as unknown as { revision: number; doc: JourneyDoc; hash: string }
}

export interface OpsInput {
  paused?: boolean
  endsAt?: string | null
  clearEndsAt?: boolean
  ended?: { kind: 'message' | 'redirect'; message?: string | null; url?: string | null }
  leadsWebhook?: { url: string; enabled: boolean }
  clearLeadsWebhook?: boolean
}

export function useSetOps(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: OpsInput) => {
      const { data } = await api.PUT('/api/v1/campaigns/{campaign_id}/journey/ops', {
        ...path(id),
        body: input as never,
      })
      return data as unknown as Ops
    },
    onSuccess: ops => {
      client.setQueryData<Workspace>(keys.journey(id), current => (current ? { ...current, ops } : current))
      void client.invalidateQueries({ queryKey: keys.campaigns })
    },
  })
}

export async function saveEditorState(id: string, state: EditorStateData): Promise<void> {
  await api.PUT('/api/v1/campaigns/{campaign_id}/journey/editor-state', {
    ...path(id),
    body: {
      dismissedIssues: state.dismissedIssues ?? [],
      checklist: state.checklist ?? {},
      coachmarks: state.coachmarks ?? {},
    } as never,
  })
}
