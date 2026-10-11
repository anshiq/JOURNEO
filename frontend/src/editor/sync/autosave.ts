import type { JourneyDoc } from '@journey/model/types'
import { api } from '@shared/api/editor-client'
import { isProblem } from '@shared/api/problem'
import { useEffect } from 'react'
import type { Issue } from '../queries/types'
import { useEditor } from '../store'

interface SaveResponse {
  revision: number
  hash: string
  issues: Issue[]
}

async function putDraft(campaignId: string, baseRevision: number, doc: JourneyDoc): Promise<SaveResponse> {
  const { data } = await api.PUT('/api/v1/campaigns/{campaign_id}/journey/draft', {
    params: { path: { campaign_id: campaignId } },
    body: { baseRevision, doc: doc as never },
  })
  return data as unknown as SaveResponse
}

export interface Autosave {
  schedule: () => void
  flush: () => Promise<boolean>
  dispose: () => void
}

export function createAutosave(campaignId: string): Autosave {
  let timer: number | undefined
  let firstDirtyAt: number | undefined
  let inFlight: Promise<void> | undefined
  let attempt = 0
  let lastSent: JourneyDoc | null = useEditor.getState().doc

  const send = async (): Promise<void> => {
    const state = useEditor.getState()
    const doc = state.doc
    if (!doc || state.conflict) return
    state.setStatus('saving')
    try {
      const response = await putDraft(campaignId, state.revision, doc)
      attempt = 0
      firstDirtyAt = undefined
      lastSent = doc
      useEditor.getState().saved(response.revision, response.hash, response.issues, doc)
      if (useEditor.getState().doc !== doc) schedule()
    } catch (error) {
      if (isProblem(error, 409)) {
        const problem = error.problem as unknown as {
          serverRevision: number
          serverDoc: JourneyDoc
          serverHash: string
        }
        useEditor.getState().setConflict({
          serverRevision: problem.serverRevision,
          serverDoc: problem.serverDoc,
          serverHash: problem.serverHash,
        })
        return
      }
      if (isProblem(error, 422)) {
        useEditor.getState().setStatus('error')
        return
      }
      useEditor.getState().setStatus(navigator.onLine ? 'error' : 'offline')
      attempt += 1
      timer = window.setTimeout(run, Math.min(30_000, 1000 * 2 ** (attempt - 1)))
    }
  }

  const run = () => {
    timer = undefined
    inFlight ??= send().finally(() => {
      inFlight = undefined
    })
  }

  const schedule = () => {
    firstDirtyAt ??= performance.now()
    window.clearTimeout(timer)
    const wait = Math.max(0, Math.min(800, 5000 - (performance.now() - firstDirtyAt)))
    timer = window.setTimeout(run, wait)
  }

  const flush = async (): Promise<boolean> => {
    window.clearTimeout(timer)
    if (inFlight) await inFlight
    const state = useEditor.getState()
    if (state.doc !== lastSent || state.status === 'dirty' || state.status === 'error') await send()
    return useEditor.getState().status === 'clean'
  }

  const online = () => {
    if (attempt > 0) run()
  }
  window.addEventListener('online', online)
  return {
    schedule,
    flush,
    dispose: () => {
      window.clearTimeout(timer)
      window.removeEventListener('online', online)
    },
  }
}

let current: Autosave | null = null

export function activeAutosave(): Autosave | null {
  return current
}

export function useAutosave(campaignId: string, ready: boolean): void {
  useEffect(() => {
    if (!ready) return
    const autosave = createAutosave(campaignId)
    current = autosave
    let previous = useEditor.getState().doc
    const unsubscribe = useEditor.subscribe(state => {
      if (state.doc !== previous) {
        previous = state.doc
        if (state.status === 'dirty') autosave.schedule()
      }
    })
    const beforeUnload = (event: BeforeUnloadEvent) => {
      const status = useEditor.getState().status
      if (status === 'dirty' || status === 'saving' || status === 'error' || status === 'offline') {
        event.preventDefault()
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => {
      unsubscribe()
      window.removeEventListener('beforeunload', beforeUnload)
      void autosave.flush()
      autosave.dispose()
      if (current === autosave) current = null
    }
  }, [campaignId, ready])
}
