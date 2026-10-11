import { cn } from '@shared/ui/cn'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ChevronDown, Circle } from 'lucide-react'
import { useState } from 'react'
import { keys } from '../queries/campaigns'
import { saveEditorState } from '../queries/journey'
import type { Ops, Workspace } from '../queries/types'
import { useEditor } from '../store'

interface Item {
  id: string
  label: string
  done: boolean
  go: () => void
}

export function useChecklist(campaignId: string) {
  const client = useQueryClient()
  const workspace = client.getQueryData<Workspace>(keys.journey(campaignId))
  const state = workspace?.editorState ?? {}
  const tick = (id: string, value = true) => {
    const next = { ...state, checklist: { ...(state.checklist ?? {}), [id]: value } }
    client.setQueryData<Workspace>(keys.journey(campaignId), current =>
      current ? { ...current, editorState: next } : current,
    )
    void saveEditorState(campaignId, next).catch(() => undefined)
  }
  return { checked: state.checklist ?? {}, tick }
}

export function ReadyChecklist({ campaignId, ops }: { campaignId: string; ops: Ops }) {
  const doc = useEditor(state => state.doc)
  const [open, setOpen] = useState(true)
  const { checked, tick } = useChecklist(campaignId)
  if (!doc) return null
  const images = Object.values(doc.screens ?? {}).flatMap(screen => [
    ...(screen.elements ?? []).filter(el => el.type === 'image').map(el => (el.type === 'image' ? el.props.src : '')),
    screen.layout?.media?.src ?? '',
  ])
  const items: Item[] = [
    {
      id: 'logo',
      label: 'Add your logo',
      done: Boolean(doc.theme?.logo?.src),
      go: () => {
        useEditor.getState().setTab('design')
        useEditor.getState().focusField('logo')
      },
    },
    {
      id: 'photos',
      label: 'Replace sample photos',
      done: Boolean(checked.photos) || images.filter(Boolean).every(src => src.startsWith('/api/')),
      go: () => tick('photos'),
    },
    {
      id: 'leads',
      label: 'Choose where leads go',
      done: Boolean(checked.leads) || Boolean(ops.leadsWebhook),
      go: () => {
        tick('leads')
        useEditor.getState().setPanel('settings')
      },
    },
    {
      id: 'devices',
      label: 'Check on your phone',
      done: Boolean(checked.devices),
      go: () => {
        tick('devices')
        useEditor.getState().setCanvas('all')
      },
    },
  ]
  const remaining = items.filter(item => !item.done).length
  if (remaining === 0 && !open) return null
  return (
    <div className="m-2 rounded-lg border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-xs font-semibold text-slate-700">
          {remaining === 0 ? 'All set, ready to publish' : `Get ready to publish · ${remaining} left`}
        </span>
        <ChevronDown size={14} className={cn('text-slate-500 transition', open && 'rotate-180')} />
      </button>
      {open ? (
        <ul className="space-y-0.5 px-2 pb-2">
          {items.map(item => (
            <li key={item.id}>
              <button
                type="button"
                onClick={item.go}
                className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-xs text-slate-700 hover:bg-white"
              >
                {item.done ? (
                  <CheckCircle2 size={14} className="text-emerald-600" />
                ) : (
                  <Circle size={14} className="text-slate-400" />
                )}
                <span className={cn(item.done && 'text-slate-400 line-through')}>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
