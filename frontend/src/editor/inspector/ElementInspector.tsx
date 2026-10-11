import { deleteElement, duplicateElement } from '@journey/ops/index'
import { elementLabel } from '@journey/summary'
import { Copy, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useEditor } from '../store'
import { act, findElement } from '../store/commands'
import { Button } from '../ui/Button'
import { Tabs } from '../ui/Tabs'
import { ContentEditor } from './content'
import { LogicEditor } from './logic'
import { StyleEditor } from './style'

const TYPE_LABEL: Record<string, string> = {
  heading: 'Heading',
  text: 'Text',
  image: 'Image',
  video: 'Video',
  buttons: 'Buttons',
  cards: 'Cards',
  countdown: 'Countdown',
  spacer: 'Spacer',
  choice: 'Question',
  rating: 'Rating',
  form: 'Form',
}

export function ElementInspector({ elementId }: { elementId: string }) {
  const doc = useEditor(state => state.doc)
  const [tab, setTab] = useState('content')
  const found = doc ? findElement(doc, elementId) : null
  if (!found) return null
  const { element, screen } = found
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{TYPE_LABEL[element.type]}</p>
          <p className="truncate text-sm font-medium text-slate-900">{elementLabel(element)}</p>
        </div>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Duplicate"
            title="Duplicate"
            onClick={() => act('Duplicate element', duplicateElement(element.id))}
          >
            <Copy size={15} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Delete"
            title="Delete"
            onClick={() => act('Delete element', deleteElement(element.id))}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      </div>
      <Tabs
        className="min-h-0 flex-1"
        value={tab}
        onChange={setTab}
        tabs={[
          {
            value: 'content',
            label: 'Content',
            content: (
              <div className="space-y-4 p-4">
                <ContentEditor element={element} screenId={screen.id} />
              </div>
            ),
          },
          {
            value: 'style',
            label: 'Style',
            content: (
              <div className="p-4">
                <StyleEditor element={element} />
              </div>
            ),
          },
          {
            value: 'logic',
            label: 'Logic',
            content: (
              <div className="p-4">
                <LogicEditor element={element} screenId={screen.id} />
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
