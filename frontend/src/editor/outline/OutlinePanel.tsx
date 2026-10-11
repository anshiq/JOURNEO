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
import { buildIndex } from '@journey/analysis'
import { addScreenAfter, deleteScreen, deleteStep, duplicateScreen, moveScreenAfter } from '@journey/ops/index'
import { type OutlineRow, outline } from '@journey/outline'
import { stepName } from '@journey/summary'
import { cn } from '@shared/ui/cn'
import { ExternalLink, GitBranch, GripVertical, LayoutTemplate, MoreHorizontal, Plus, Square } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useRecipes } from '../queries/library'
import type { Ops } from '../queries/types'
import { useEditor } from '../store'
import { act } from '../store/commands'
import { Menu } from '../ui/Menu'
import { Popover, PopoverClose } from '../ui/Popover'
import { ReadyChecklist } from './ReadyChecklist'

export function OutlinePanel({ campaignId, ops }: { campaignId: string; ops: Ops }) {
  const doc = useEditor(state => state.doc)
  const selection = useEditor(state => state.selection)
  const issues = useEditor(state => state.issues)
  const index = useMemo(() => (doc ? buildIndex(doc) : null), [doc])
  const rows = useMemo(
    () => (doc && index ? outline(doc, index).filter(row => index.kinds[row.stepId] !== 'start') : []),
    [doc, index],
  )
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  if (!doc || !index) return null
  const main = rows.filter(row => row.group === 'main')
  const unconnected = rows.filter(row => row.group === 'unconnected')
  const selectedId =
    selection.kind === 'screen' || selection.kind === 'element' || selection.kind === 'item'
      ? selection.screenId
      : selection.kind === 'step'
        ? selection.stepId
        : null
  const issueCount = (stepId: string) =>
    issues.filter(issue => issue.severity === 'error' && (issue.target.screenId ?? issue.target.id) === stepId).length
  const startId = (doc.steps ?? []).find(step => step.kind === 'start')?.id ?? ''
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = main.map(row => row.stepId)
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    const without = ids.filter(id => id !== active.id)
    const insertAt = to > from ? to : to
    const after = insertAt === 0 ? startId : (without[insertAt - 1] ?? startId)
    if (doc.screens?.[String(active.id)]) act('Move screen', moveScreenAfter(String(active.id), after))
  }
  return (
    <nav aria-label="Screens" className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <ReadyChecklist campaignId={campaignId} ops={ops} />
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Screens</h2>
        <button
          type="button"
          onClick={() => startId && useEditor.getState().select({ kind: 'step', stepId: startId })}
          className="text-[11px] text-slate-500 hover:text-indigo-700"
        >
          Start
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" data-coachmark="outline">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={main.map(row => row.stepId)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-0.5">
              {main.map(row => (
                <OutlineItem
                  key={row.stepId}
                  row={row}
                  selected={selectedId === row.stepId}
                  errors={issueCount(row.stepId)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        <AddScreen afterStepId={selectedId && doc.screens?.[selectedId] ? selectedId : (main.at(-1)?.stepId ?? null)} />
        {unconnected.length ? (
          <div className="mt-4">
            <p className="px-1 pb-1 text-xs font-medium text-amber-700">Not connected ({unconnected.length})</p>
            <ul className="space-y-0.5">
              {unconnected.map(row => (
                <OutlineItem
                  key={row.stepId}
                  row={row}
                  selected={selectedId === row.stepId}
                  errors={issueCount(row.stepId)}
                  static
                />
              ))}
            </ul>
            <p className="px-1 pt-1 text-[11px] text-slate-500">
              Visitors never see these. Connect them or delete them.
            </p>
          </div>
        ) : null}
      </div>
    </nav>
  )
}

function OutlineItem({
  row,
  selected,
  errors,
  static: fixed,
}: {
  row: OutlineRow
  selected: boolean
  errors: number
  static?: boolean
}) {
  const doc = useEditor(state => state.doc)
  const kind = doc?.screens?.[row.stepId] ? 'screen' : (doc?.steps ?? []).find(step => step.id === row.stepId)?.kind
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: row.stepId,
    disabled: fixed || kind !== 'screen',
  })
  if (!doc) return null
  const name = stepName(doc, row.stepId)
  const Icon = kind === 'condition' ? GitBranch : kind === 'redirect' ? ExternalLink : Square
  const select = () =>
    useEditor
      .getState()
      .select(kind === 'screen' ? { kind: 'screen', screenId: row.stepId } : { kind: 'step', stepId: row.stepId })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, paddingLeft: row.depth * 12 }}
      className={cn(isDragging && 'relative z-10')}
    >
      {row.pathLabel ? <p className="truncate pt-1 pl-6 text-[11px] text-slate-500">↳ {row.pathLabel}</p> : null}
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md pr-1 text-sm',
          selected ? 'bg-indigo-50 text-indigo-900' : 'text-slate-700 hover:bg-slate-100',
        )}
      >
        {kind === 'screen' && !fixed ? (
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Drag ${name}`}
            className="cursor-grab rounded p-1 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-500 focus-visible:opacity-100"
          >
            <GripVertical size={13} />
          </button>
        ) : (
          <span className="w-[21px]" />
        )}
        <button type="button" onClick={select} className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left">
          <Icon size={13} className="shrink-0 text-slate-400" />
          <span className="truncate">{name}</span>
          {row.terminal && kind === 'screen' ? (
            <span className="shrink-0 rounded bg-slate-100 px-1 text-[10px] text-slate-500">Ends here</span>
          ) : null}
          {errors ? (
            <span className="shrink-0 rounded-full bg-rose-100 px-1.5 text-[10px] font-medium text-rose-700">
              {errors}
            </span>
          ) : null}
        </button>
        <Menu
          trigger={
            <button
              type="button"
              aria-label={`More for ${name}`}
              className="rounded p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-white focus-visible:opacity-100"
            >
              <MoreHorizontal size={14} />
            </button>
          }
          items={
            kind === 'screen'
              ? [
                  { label: 'Play from here', onSelect: () => useEditor.getState().play(row.stepId) },
                  { label: 'Duplicate', onSelect: () => act('Duplicate screen', duplicateScreen(row.stepId)) },
                  'separator',
                  { label: 'Delete', danger: true, onSelect: () => act('Delete screen', deleteScreen(row.stepId)) },
                ]
              : [{ label: 'Delete', danger: true, onSelect: () => act('Delete step', deleteStep(row.stepId)) }]
          }
        />
      </div>
    </li>
  )
}

export function AddScreen({ afterStepId }: { afterStepId: string | null }) {
  const recipes = useRecipes()
  const [open, setOpen] = useState(false)
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      className="w-80"
      trigger={
        <button
          type="button"
          className="mt-2 flex w-full items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-2 py-1.5 text-sm text-slate-600 hover:border-indigo-400 hover:text-indigo-700"
        >
          <Plus size={14} /> Add screen
        </button>
      }
    >
      <p className="px-1 pb-2 text-xs font-medium text-slate-500">Choose a starting point</p>
      <div className="grid grid-cols-2 gap-1.5">
        {(recipes.data ?? []).map(recipe => (
          <PopoverClose asChild key={recipe.id}>
            <button
              type="button"
              onClick={() =>
                act(`Add ${recipe.name}`, addScreenAfter(afterStepId, recipe as never, { name: recipe.name }))
              }
              className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-2 text-left text-xs hover:border-indigo-300 hover:bg-indigo-50"
            >
              <LayoutTemplate size={13} className="shrink-0 text-slate-400" />
              {recipe.name}
            </button>
          </PopoverClose>
        ))}
      </div>
    </Popover>
  )
}
