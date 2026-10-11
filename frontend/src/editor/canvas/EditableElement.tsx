import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Breakpoint } from '@experience/index'
import type { Element } from '@journey/model/types'
import { deleteElement, duplicateElement, moveElement, setHidden } from '@journey/ops/index'
import { screenPorts } from '@journey/ports'
import { elementLabel } from '@journey/summary'
import { cn } from '@shared/ui/cn'
import { ArrowDown, ArrowUp, Copy, GripVertical, MoreHorizontal, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { DestinationPicker } from '../inspector/widgets/DestinationPicker'
import { useEditor } from '../store'
import { copySelection } from '../store/clipboard'
import { act } from '../store/commands'
import { Menu } from '../ui/Menu'

const DEVICE_NAMES: Record<Breakpoint, string> = { mobile: 'mobile', tablet: 'tablet', desktop: 'desktop' }

export function EditableElement({
  element,
  screenId,
  visible,
  children,
}: {
  element: Element
  screenId: string
  visible: boolean
  children: ReactNode
}) {
  const selected = useEditor(
    state =>
      (state.selection.kind === 'element' || state.selection.kind === 'item') &&
      state.selection.elementId === element.id,
  )
  const breakpoint = useEditor(state => state.breakpoint)
  const screen = useEditor(state => state.doc?.screens?.[screenId])
  const screens = useEditor(state => state.doc?.screens)
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: element.id,
    data: { screenId },
  })
  const elements = screen?.elements ?? []
  const position = elements.findIndex(el => el.id === element.id)
  const ports = screen ? screenPorts(screen).filter(port => port.elementId === element.id) : []
  const label = elementLabel(element)
  const toolButton = (title: string, icon: ReactNode, onClick: () => void, disabled = false) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={event => {
        event.stopPropagation()
        onClick()
      }}
      className="flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30"
    >
      {icon}
    </button>
  )
  return (
    <div
      ref={setNodeRef}
      role="group"
      aria-label={label}
      data-editable-element={element.id}
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 30 : undefined }}
      className={cn(
        'group/el relative rounded-sm outline-offset-2',
        selected
          ? 'outline-2 outline-indigo-500 outline-solid'
          : 'hover:outline-1 hover:outline-indigo-300 hover:outline-dashed',
        isDragging && 'opacity-70',
      )}
      onClickCapture={event => {
        const target = event.target as HTMLElement
        if (target.closest('a[href]')) event.preventDefault()
        if (target.closest('[data-inline-editor],[role="textbox"]')) return
        if (target.closest('button,input,select,textarea,label') && !target.closest('[data-chip]'))
          event.preventDefault()
      }}
      onClick={event => {
        if ((event.target as HTMLElement).closest('[data-chip],[data-toolbar]')) return
        event.stopPropagation()
        if (!selected) useEditor.getState().select({ kind: 'element', screenId, elementId: element.id })
      }}
      onKeyDown={event => {
        if (event.key === 'Enter' && event.target === event.currentTarget)
          useEditor.getState().select({ kind: 'element', screenId, elementId: element.id })
      }}
    >
      {selected ? (
        <div
          data-toolbar=""
          className="absolute -top-9 right-0 z-30 flex items-center gap-0.5 rounded-md border border-slate-200 bg-white p-0.5 font-sans shadow-md"
          style={{ fontSize: 13 }}
        >
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Drag ${label}`}
            title="Drag to reorder"
            className="flex h-7 w-7 cursor-grab items-center justify-center rounded text-slate-600 hover:bg-slate-100"
          >
            <GripVertical size={15} />
          </button>
          {toolButton(
            'Move up',
            <ArrowUp size={15} />,
            () => act('Move element', moveElement(element.id, screenId, position - 1)),
            position <= 0,
          )}
          {toolButton(
            'Move down',
            <ArrowDown size={15} />,
            () => act('Move element', moveElement(element.id, screenId, position + 1)),
            position >= elements.length - 1,
          )}
          {toolButton('Duplicate', <Copy size={15} />, () => act('Duplicate element', duplicateElement(element.id)))}
          {toolButton('Delete', <Trash2 size={15} />, () => act('Delete element', deleteElement(element.id)))}
          <Menu
            trigger={
              <button
                type="button"
                aria-label="More actions"
                className="flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-100"
              >
                <MoreHorizontal size={15} />
              </button>
            }
            items={[
              { label: 'Copy', onSelect: () => void copySelection() },
              {
                label: `Hide on ${DEVICE_NAMES[breakpoint]} only`,
                onSelect: () =>
                  act(
                    'Hide element',
                    setHidden(
                      element.id,
                      true,
                      breakpoint === 'mobile' ? 'mobileOnly' : breakpoint === 'tablet' ? 'tabletUp' : 'desktopOnly',
                    ),
                  ),
              },
              'separator',
              ...Object.values(screens ?? {})
                .filter(other => other.id !== screenId)
                .slice(0, 12)
                .map(other => ({
                  label: `Move to ${other.name}`,
                  onSelect: () => act('Move element', moveElement(element.id, other.id, other.elements?.length ?? 0)),
                })),
            ]}
          />
        </div>
      ) : null}
      {!visible ? (
        <div className="mb-1 flex items-center gap-2 font-sans text-xs text-slate-600" data-chip="">
          <span className="rounded bg-slate-200 px-1.5 py-0.5">Hidden on {DEVICE_NAMES[breakpoint]}</span>
          <button
            type="button"
            className="text-indigo-700 underline"
            onClick={() => act('Show element', setHidden(element.id, false, 'all'))}
          >
            Show
          </button>
        </div>
      ) : null}
      {children}
      {ports.length ? (
        <div className="mt-1 flex flex-wrap gap-1" data-chip="">
          {ports.map(port => (
            <DestinationPicker
              key={port.port}
              stepId={screenId}
              port={port.port}
              fallback={port.fallback}
              label={port.label}
              compact
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
