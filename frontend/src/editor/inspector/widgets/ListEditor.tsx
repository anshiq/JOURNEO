import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@shared/ui/cn'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

export interface ListEditorProps<T extends { id: string }> {
  items: T[]
  label: string
  addLabel: string
  max: number
  min?: number
  onAdd: () => void
  onMove: (from: number, to: number) => void
  onDelete: (item: T) => void
  renderRow: (item: T, index: number) => ReactNode
  selectedId?: string | undefined
  onSelect?: (item: T) => void
  extraActions?: ReactNode
}

export function ListEditor<T extends { id: string }>(props: ListEditorProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = props.items.map(item => item.id)
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    props.onMove(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))
  }
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-700">{props.label}</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1.5">
            {props.items.map((item, index) => (
              <Row
                key={item.id}
                id={item.id}
                selected={props.selectedId === item.id}
                onSelect={props.onSelect ? () => props.onSelect?.(item) : undefined}
                canDelete={props.items.length > (props.min ?? 0)}
                onDelete={() => props.onDelete(item)}
                index={index}
              >
                {props.renderRow(item, index)}
              </Row>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={props.items.length >= props.max}
          onClick={props.onAdd}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:text-slate-400"
        >
          <Plus size={13} /> {props.addLabel}
        </button>
        {props.extraActions}
      </div>
    </div>
  )
}

function Row({
  id,
  children,
  selected,
  onSelect,
  canDelete,
  onDelete,
  index,
}: {
  id: string
  children: ReactNode
  selected: boolean
  onSelect: (() => void) | undefined
  canDelete: boolean
  onDelete: () => void
  index: number
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'flex items-start gap-1 rounded-md border bg-white p-1.5',
        selected ? 'border-indigo-400 ring-1 ring-indigo-200' : 'border-slate-200',
        isDragging && 'z-10 shadow-md',
      )}
      onFocusCapture={onSelect}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Reorder item ${index + 1}`}
        className="mt-1.5 cursor-grab rounded p-0.5 text-slate-400 hover:bg-slate-100"
      >
        <GripVertical size={14} />
      </button>
      <div className="min-w-0 flex-1 space-y-1.5">{children}</div>
      <button
        type="button"
        aria-label={`Delete item ${index + 1}`}
        disabled={!canDelete}
        onClick={onDelete}
        className="mt-1.5 rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
      >
        <Trash2 size={14} />
      </button>
    </li>
  )
}

export function RowInput({
  value,
  max,
  onChange,
  label,
  placeholder,
  onEnter,
  onBackspaceEmpty,
  onPasteLines,
  field,
}: {
  value: string
  max: number
  onChange: (value: string) => void
  label: string
  placeholder?: string | undefined
  onEnter?: (() => void) | undefined
  onBackspaceEmpty?: (() => void) | undefined
  onPasteLines?: ((lines: string[]) => void) | undefined
  field?: string | undefined
}) {
  return (
    <input
      type="text"
      aria-label={label}
      data-field={field}
      maxLength={max}
      value={value}
      placeholder={placeholder}
      onChange={event => onChange(event.target.value)}
      onKeyDown={event => {
        if (event.key === 'Enter' && onEnter) {
          event.preventDefault()
          onEnter()
        } else if (event.key === 'Backspace' && value === '' && onBackspaceEmpty) {
          event.preventDefault()
          onBackspaceEmpty()
        }
      }}
      onPaste={event => {
        const text = event.clipboardData.getData('text/plain')
        if (onPasteLines && text.includes('\n')) {
          event.preventDefault()
          onPasteLines(text.split(/\r?\n/).filter(line => line.trim()))
        }
      }}
      className="h-8 w-full rounded border border-slate-300 px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    />
  )
}
