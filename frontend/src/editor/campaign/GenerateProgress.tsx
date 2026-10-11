import { api } from '@shared/api/editor-client'
import { isProblem } from '@shared/api/problem'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { aiFailureMessage, useCancelGeneration, useGenerationJob, useStartGeneration } from '../queries/ai'
import { validateDoc } from '../queries/journey'
import type { Workspace } from '../queries/types'
import { useEditor } from '../store'
import { Button } from '../ui/Button'

async function loadFinishedDraft(campaignId: string): Promise<void> {
  const { data } = await api.GET('/api/v1/campaigns/{campaign_id}/journey', {
    params: { path: { campaign_id: campaignId } },
  })
  const workspace = data as unknown as Workspace
  const editor = useEditor.getState()
  if (editor.campaignId !== campaignId) return
  editor.replaceDoc(workspace.draft.doc, 'generate', workspace.draft.revision, workspace.draft.hash)
  const issues = await validateDoc(campaignId, workspace.draft.doc).catch(() => null)
  if (issues && useEditor.getState().campaignId === campaignId) useEditor.getState().setIssues(issues)
}

export function GenerationOverlay({
  campaignId,
  jobId,
  onClose,
  onRetry,
}: {
  campaignId: string
  jobId: string
  onClose: () => void
  onRetry: (jobId: string) => void
}) {
  const job = useGenerationJob(campaignId, jobId)
  const cancel = useCancelGeneration(campaignId)
  const start = useStartGeneration(campaignId)
  const loaded = useRef<string | null>(null)
  const data = job.data
  const status = data?.status
  useEffect(() => {
    if (status !== 'done' || loaded.current === jobId) return
    loaded.current = jobId
    loadFinishedDraft(campaignId).catch(() => toast.error('Could not load the new journey. Reload the page.'))
  }, [status, jobId, campaignId])
  const screens = data?.outline?.screens ?? []
  const working = status === 'queued' || status === 'running' || !data
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Writing your journey"
      data-generation={status ?? 'loading'}
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-indigo-600" />
          <p className="text-base font-semibold text-slate-900">
            {status === 'done'
              ? 'Your journey is ready'
              : status === 'cancelled'
                ? 'Stopped'
                : status === 'error'
                  ? 'Something went wrong'
                  : data?.stage === 'content'
                    ? 'Writing your screens'
                    : 'Planning your journey'}
          </p>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {status === 'done' && data?.fallbackScreens.length
            ? `${data.fallbackScreens.length} screen${data.fallbackScreens.length === 1 ? '' : 's'} use template copy. Edit them or try again.`
            : status === 'cancelled'
              ? 'Your draft is unchanged.'
              : status === 'error'
                ? (data?.error ?? 'The draft is unchanged.')
                : 'You can keep reading while this runs. The draft updates when it is ready.'}
        </p>
        {screens.length > 0 ? (
          <ol className="mt-4 space-y-2" aria-label="Screens">
            {screens.map(screen => (
              <li key={screen.title} className="flex items-center gap-2 text-sm text-slate-700">
                {status === 'done' ? (
                  <Check size={14} className="text-emerald-600" />
                ) : (
                  <Loader2 size={14} className="animate-spin text-slate-400" />
                )}
                <span>{screen.title}</span>
                {screen.ends ? <span className="text-xs text-slate-400">Ends here</span> : null}
              </li>
            ))}
          </ol>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          {working ? (
            <Button variant="secondary" disabled={cancel.isPending} onClick={() => cancel.mutate(jobId)}>
              Stop
            </Button>
          ) : null}
          {status === 'error' || status === 'cancelled' ? (
            <Button
              variant="secondary"
              disabled={start.isPending || !data}
              onClick={() =>
                data &&
                start.mutate(data.brief, {
                  onSuccess: result => onRetry(result.jobId),
                  onError: failure => {
                    const activeJobId = isProblem(failure, 409) ? failure.problem.activeJobId : undefined
                    if (typeof activeJobId === 'string') {
                      toast.info('This campaign already has a journey being written. Showing it.')
                      onRetry(activeJobId)
                      return
                    }
                    toast.error(aiFailureMessage(failure, 'Could not start again. Try later.'))
                  },
                })
              }
            >
              Try again
            </Button>
          ) : null}
          {status === 'done' || status === 'error' || status === 'cancelled' ? (
            <Button variant="primary" onClick={onClose}>
              {status === 'done' ? 'Start editing' : 'Back to editor'}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
