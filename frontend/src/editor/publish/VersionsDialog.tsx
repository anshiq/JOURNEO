import type { JourneyDoc } from '@journey/model/types'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { PlayFrame } from '../play/PlayFrame'
import { keys } from '../queries/campaigns'
import { fetchCheckpointDoc, fetchVersionDoc, restore, useCheckpoints, useVersions } from '../queries/journey'
import { useEditor } from '../store'
import { activeAutosave } from '../sync/autosave'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

const REASONS: Record<string, string> = {
  periodic: 'Autosaved',
  before_restore: 'Before restoring',
  before_generate: 'Before AI changes',
  before_ai: 'Before AI changes',
  conflict_rejected: 'Your version from a conflict',
  conflict: 'Before a conflict',
  manual: 'Saved',
}

export function VersionsDialog({ campaignId }: { campaignId: string }) {
  const open = useEditor(state => state.panel === 'versions')
  const versions = useVersions(campaignId, open)
  const checkpoints = useCheckpoints(campaignId, open)
  const client = useQueryClient()
  const [preview, setPreview] = useState<{ label: string; doc: JourneyDoc } | null>(null)
  const [busy, setBusy] = useState(false)
  const close = () => {
    setPreview(null)
    useEditor.getState().setPanel(null)
  }
  const doRestore = async (ref: { versionNo: number } | { checkpointId: string }, label: string) => {
    setBusy(true)
    try {
      await activeAutosave()?.flush()
      const restored = await restore(campaignId, ref)
      useEditor.getState().replaceDoc(restored.doc, 'restore', restored.revision, restored.hash)
      void client.invalidateQueries({ queryKey: keys.checkpoints(campaignId) })
      toast.success(`Restored ${label}. Publish to make it live.`)
      close()
    } catch {
      toast.error('Could not restore. Try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={next => !next && close()}
      title="Version history"
      description="Preview or restore an earlier version. Restoring replaces your draft, and a copy of the current draft is kept."
      wide
    >
      <div className="flex gap-4">
        <div className="min-w-0 flex-1 space-y-5">
          <section>
            <h3 className="pb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Published</h3>
            {versions.data?.length === 0 ? <p className="text-sm text-slate-500">Nothing published yet.</p> : null}
            <ul className="space-y-1">
              {(versions.data ?? []).map(version => (
                <li
                  key={version.versionNo}
                  className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      Version {version.versionNo}
                      {version.live ? (
                        <span className="ml-2 rounded bg-emerald-100 px-1.5 text-xs text-emerald-800">Live</span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {new Date(version.publishedAt).toLocaleString()}
                      {version.notes ? ` · ${version.notes}` : ''}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () =>
                      setPreview({
                        label: `Version ${version.versionNo}`,
                        doc: await fetchVersionDoc(campaignId, version.versionNo),
                      })
                    }
                  >
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => void doRestore({ versionNo: version.versionNo }, `version ${version.versionNo}`)}
                  >
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="pb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Autosaved</h3>
            {checkpoints.data?.length === 0 ? <p className="text-sm text-slate-500">No autosaved copies yet.</p> : null}
            <ul className="space-y-1">
              {(checkpoints.data ?? []).map(checkpoint => (
                <li
                  key={checkpoint.id}
                  className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p>{REASONS[checkpoint.reason] ?? 'Autosaved'}</p>
                    <p className="text-xs text-slate-500">{new Date(checkpoint.createdAt).toLocaleString()}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () =>
                      setPreview({
                        label: REASONS[checkpoint.reason] ?? 'Autosaved',
                        doc: await fetchCheckpointDoc(campaignId, checkpoint.id),
                      })
                    }
                  >
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => void doRestore({ checkpointId: checkpoint.id }, 'the autosaved copy')}
                  >
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </div>
        {preview ? (
          <div className="shrink-0 space-y-2">
            <p className="text-xs text-slate-500">Preview · {preview.label}</p>
            <PlayFrame
              key={preview.label}
              doc={preview.doc}
              startAt={null}
              device="mobile"
              scale={0.62}
              title={`Preview of ${preview.label}`}
            />
          </div>
        ) : null}
      </div>
    </Dialog>
  )
}
