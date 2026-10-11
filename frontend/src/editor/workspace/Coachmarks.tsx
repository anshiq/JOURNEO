import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useState } from 'react'
import { keys } from '../queries/campaigns'
import { saveEditorState } from '../queries/journey'
import type { Workspace } from '../queries/types'
import { Button } from '../ui/Button'

const MARKS = [
  {
    id: 'edit',
    title: 'Click any text to edit it',
    body: 'Select anything on the screen to change it. Use + between items to add more.',
  },
  {
    id: 'outline',
    title: 'Add screens and paths here',
    body: 'Screens are listed in the order visitors see them. Drag to reorder.',
  },
  {
    id: 'publish',
    title: 'Preview and publish',
    body: 'Play tries your journey like a visitor would. Publish makes your link live.',
  },
]

export function Coachmarks({ campaignId, workspace }: { campaignId: string; workspace: Workspace }) {
  const client = useQueryClient()
  const seen = workspace.editorState?.coachmarks ?? {}
  const pending = MARKS.filter(mark => !seen[mark.id])
  const [index, setIndex] = useState(0)
  const mark = pending[index]
  if (!mark) return null
  const dismiss = (all: boolean) => {
    const coachmarks = { ...seen, ...(all ? Object.fromEntries(MARKS.map(m => [m.id, true])) : { [mark.id]: true }) }
    const next = { ...(workspace.editorState ?? {}), coachmarks }
    client.setQueryData<Workspace>(keys.journey(campaignId), current =>
      current ? { ...current, editorState: next } : current,
    )
    void saveEditorState(campaignId, next).catch(() => undefined)
    if (!all) setIndex(0)
  }
  return (
    <div
      role="dialog"
      aria-label={mark.title}
      className="fixed bottom-6 left-1/2 z-30 w-[22rem] -translate-x-1/2 rounded-xl bg-slate-900 p-4 text-white shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] text-slate-400">
            Tip {MARKS.length - pending.length + 1} of {MARKS.length}
          </p>
          <p className="font-medium">{mark.title}</p>
          <p className="mt-1 text-sm text-slate-300">{mark.body}</p>
        </div>
        <button
          type="button"
          aria-label="Close tips"
          onClick={() => dismiss(true)}
          className="rounded p-1 text-slate-400 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="ghost" className="text-slate-300 hover:bg-slate-800" onClick={() => dismiss(true)}>
          Skip tips
        </Button>
        <Button size="sm" variant="primary" onClick={() => dismiss(false)}>
          Got it
        </Button>
      </div>
    </div>
  )
}
