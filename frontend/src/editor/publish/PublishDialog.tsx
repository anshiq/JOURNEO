import { isProblem } from '@shared/api/problem'
import { LIMITS } from '@shared/limits.gen'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { IssuesList } from '../issues/IssuesPanel'
import { keys } from '../queries/campaigns'
import { usePublish, validateDoc } from '../queries/journey'
import type { CampaignSummary, Issue, Workspace } from '../queries/types'
import { useEditor } from '../store'
import { activeAutosave } from '../sync/autosave'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { LinkCard } from './share-link'

type Phase = 'checking' | 'review' | 'publishing' | 'done' | 'failed'

export function PublishDialog({ campaign, workspace }: { campaign: CampaignSummary; workspace: Workspace }) {
  const open = useEditor(state => state.panel === 'publish')
  const client = useQueryClient()
  const publish = usePublish(campaign.id)
  const clientIssues = useEditor(state => state.clientIssues)
  const [phase, setPhase] = useState<Phase>('checking')
  const [issues, setIssues] = useState<Issue[]>([])
  const [notes, setNotes] = useState('')
  const [published, setPublished] = useState<number | null>(null)
  const close = () => useEditor.getState().setPanel(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setPhase('checking')
    setPublished(null)
    const run = async () => {
      await activeAutosave()?.flush()
      const doc = useEditor.getState().doc
      if (!doc) return
      try {
        const found = await validateDoc(campaign.id, doc)
        if (cancelled) return
        setIssues(found)
        useEditor.getState().setIssues(found)
        setPhase('review')
      } catch {
        if (!cancelled) setPhase('failed')
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [open, campaign.id])

  const errors = issues.filter(issue => issue.severity === 'error')
  const warnings = [...issues.filter(issue => issue.severity === 'warning'), ...clientIssues]
  const hash = useEditor(state => state.hash)
  const changed = !workspace.live || workspace.live.hash !== hash

  const doPublish = async () => {
    setPhase('publishing')
    const saved = await activeAutosave()?.flush()
    if (saved === false) {
      toast.error('Your latest changes are not saved yet. Try again in a moment.')
      setPhase('review')
      return
    }
    const revision = useEditor.getState().revision
    publish.mutate(
      { revision, ...(notes.trim() ? { notes: notes.trim() } : {}) },
      {
        onSuccess: result => {
          setPublished(result.versionNo)
          setPhase('done')
          useEditor.getState().setLiveHash(result.hash)
          client.setQueryData<Workspace>(keys.journey(campaign.id), current =>
            current
              ? {
                  ...current,
                  status: current.status === 'paused' || current.status === 'ended' ? current.status : 'live',
                }
              : current,
          )
        },
        onError: error => {
          setPhase('review')
          if (isProblem(error, 409)) toast.error('Changes were still saving. Try publishing again.')
          else if (isProblem(error, 422)) toast.error('Fix the highlighted problems first.')
          else toast.error('Publishing failed. Try again.')
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => !next && close()}
      title={phase === 'done' ? 'Your campaign is live' : 'Publish'}
      description={phase === 'done' ? undefined : 'Check everything once more, then make it live.'}
      footer={
        phase === 'done' ? (
          <Button variant="primary" onClick={close}>
            Done
          </Button>
        ) : (
          <>
            <Button onClick={close}>Cancel</Button>
            <Button
              variant="primary"
              disabled={phase !== 'review' || errors.length > 0 || !changed}
              onClick={() => void doPublish()}
            >
              {phase === 'publishing' ? <Loader2 size={14} className="animate-spin" /> : null}
              {warnings.length && !errors.length
                ? 'Publish anyway'
                : `Publish version ${(workspace.live?.versionNo ?? 0) + 1}`}
            </Button>
          </>
        )
      }
    >
      {phase === 'checking' ? (
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 size={15} className="animate-spin" /> Checking your journey…
        </p>
      ) : null}
      {phase === 'failed' ? <p className="text-sm text-rose-700">We could not check your journey. Try again.</p> : null}
      {phase === 'review' || phase === 'publishing' ? (
        <div className="space-y-4">
          {errors.length ? (
            <div>
              <p className="pb-2 text-sm font-medium text-rose-800">
                Fix {errors.length === 1 ? 'this' : `these ${errors.length}`} before publishing
              </p>
              <IssuesList issues={errors} onFix={close} />
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-emerald-800">
              <CheckCircle2 size={16} /> Nothing blocks publishing.
            </p>
          )}
          {warnings.length ? (
            <details>
              <summary className="cursor-pointer text-sm text-amber-800">
                {warnings.length} suggestion{warnings.length === 1 ? '' : 's'} to review
              </summary>
              <div className="mt-2">
                <IssuesList issues={warnings} onFix={close} />
              </div>
            </details>
          ) : null}
          <p className="text-sm text-slate-600">
            {!workspace.live
              ? 'This is the first version. Your link starts working as soon as you publish.'
              : changed
                ? `Replaces version ${workspace.live.versionNo}. Visitors in the middle of the journey finish on the version they started.`
                : 'Nothing changed since the live version.'}
          </p>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-700">What changed? (optional)</span>
            <input
              type="text"
              maxLength={200}
              value={notes}
              onChange={event => setNotes(event.target.value)}
              className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm"
            />
          </label>
        </div>
      ) : null}
      {phase === 'done' && campaign.publicUrl ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-700">Version {published} is live. Share your link:</p>
          <LinkCard url={campaign.publicUrl} slug={campaign.slug.slice(0, LIMITS.slug)} />
        </div>
      ) : null}
    </Dialog>
  )
}
