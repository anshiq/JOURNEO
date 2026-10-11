import { useEffect, useRef, useState } from 'react'
import { validateDoc } from '../queries/journey'
import type { Workspace } from '../queries/types'
import { useEditor } from '../store'

export function useWorkspaceLoader(campaignId: string, workspace: Workspace): boolean {
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const latest = useRef(workspace)
  latest.current = workspace
  const journeyId = workspace.journeyId
  useEffect(() => {
    if (!journeyId) return
    const draft = latest.current.draft
    useEditor.getState().load(campaignId, draft.doc, draft.revision, draft.hash, latest.current.live?.hash ?? null)
    setLoadedFor(campaignId)
    let cancelled = false
    validateDoc(campaignId, draft.doc)
      .then(issues => {
        if (!cancelled && useEditor.getState().campaignId === campaignId) useEditor.getState().setIssues(issues)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [campaignId, journeyId])
  return loadedFor === campaignId && useEditor.getState().campaignId === campaignId
}
