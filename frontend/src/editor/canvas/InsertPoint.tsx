import { insertElement } from '@journey/ops/index'
import { cn } from '@shared/ui/cn'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { usePresets } from '../queries/library'
import type { PresetItem } from '../queries/types'
import { act } from '../store/commands'
import { Popover, PopoverClose } from '../ui/Popover'

const CATEGORY_LABEL: Record<string, string> = {
  text: 'Text',
  question: 'Questions',
  lead: 'Collect details',
  offer: 'Offers & products',
  action: 'Buttons',
  layout: 'Layout',
  media: 'Media',
}

export function groupPresets(items: PresetItem[]): [string, PresetItem[]][] {
  const groups = new Map<string, PresetItem[]>()
  for (const item of items) {
    const list = groups.get(item.category) ?? []
    list.push(item)
    groups.set(item.category, list)
  }
  return [...groups.entries()]
}

const MEDIA: PresetItem[] = [
  {
    id: 'image',
    name: 'Image',
    category: 'media',
    element: { type: 'image', props: { src: '', alt: '', aspect: 'auto', focal: { x: 50, y: 50 } } },
  },
  {
    id: 'video',
    name: 'Video',
    category: 'media',
    element: { type: 'video', props: { source: { kind: 'youtube', url: '' }, autoplay: false, loop: false } },
  },
]

export function PresetList({ onPick }: { onPick: (preset: PresetItem) => void }) {
  const loaded = usePresets()
  const presets = { data: [...(loaded.data ?? []), ...MEDIA] }
  const [query, setQuery] = useState('')
  const filtered = (presets.data ?? []).filter(item => item.name.toLowerCase().includes(query.trim().toLowerCase()))
  return (
    <div className="space-y-2">
      <input
        type="search"
        maxLength={40}
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder="Search elements"
        aria-label="Search elements"
        className="h-8 w-full rounded-md border border-slate-300 px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      />
      {groupPresets(filtered).map(([category, items]) => (
        <div key={category}>
          <p className="px-1 pb-1 text-xs font-medium text-slate-500">{CATEGORY_LABEL[category] ?? category}</p>
          <div className="grid grid-cols-2 gap-1">
            {items.map(item => (
              <PopoverClose asChild key={item.id}>
                <button
                  type="button"
                  onClick={() => onPick(item)}
                  className="rounded-md border border-slate-200 px-2 py-1.5 text-left text-xs hover:border-indigo-300 hover:bg-indigo-50"
                >
                  {item.name}
                </button>
              </PopoverClose>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function InsertPoint({ screenId, index }: { screenId: string; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={cn('group/ins relative z-10 -my-2 flex h-4 items-center justify-center', open && 'z-20')}>
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-1/2 h-0.5 bg-indigo-400 opacity-0 transition group-hover/ins:opacity-100',
          open && 'opacity-100',
        )}
      />
      <Popover
        open={open}
        onOpenChange={setOpen}
        align="center"
        className="w-80"
        trigger={
          <button
            type="button"
            aria-label="Add an element here"
            title="Add an element here"
            onClick={event => event.stopPropagation()}
            className={cn(
              'relative flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white opacity-0 shadow transition group-hover/ins:opacity-100 focus-visible:opacity-100',
              open && 'opacity-100',
            )}
          >
            <Plus size={13} />
          </button>
        }
      >
        <PresetList onPick={preset => act(`Add ${preset.name}`, insertElement(screenId, index, preset.element))} />
      </Popover>
    </div>
  )
}
