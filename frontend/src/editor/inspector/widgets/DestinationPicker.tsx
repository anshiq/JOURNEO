import { buildIndex } from '@journey/analysis'
import { insertConditionOnLink, insertRedirectOnLink, insertScreenOnLink, setLink } from '@journey/ops/index'
import { stepName } from '@journey/summary'
import { resolveTarget } from '@journey/targets'
import { cn } from '@shared/ui/cn'
import { ArrowRight, ChevronDown, ExternalLink, GitBranch, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useRecipes } from '../../queries/library'
import { useEditor } from '../../store'
import { act } from '../../store/commands'
import { Popover, PopoverClose } from '../../ui/Popover'

export function DestinationPicker({
  stepId,
  port,
  fallback,
  compact,
  label,
  allowCondition,
}: {
  stepId: string
  port: string
  fallback: 'next' | null
  compact?: boolean
  label?: string
  allowCondition?: boolean
}) {
  const doc = useEditor(state => state.doc)
  const [open, setOpen] = useState(false)
  const [recipesOpen, setRecipesOpen] = useState(false)
  const recipes = useRecipes()
  const index = useMemo(() => (doc ? buildIndex(doc) : null), [doc])
  if (!doc || !index) return null
  const direct = doc.links?.[stepId]?.[port] ?? null
  const effective = resolveTarget(doc, stepId, port)
  const current = direct
    ? stepName(doc, direct)
    : fallback === 'next'
      ? effective
        ? `Next screen · ${stepName(doc, effective)}`
        : 'Next screen (default)'
      : 'Ends here'
  const candidates = (doc.steps ?? []).filter(step => step.kind !== 'start' && step.id !== stepId)
  const reachable = candidates.filter(step => index.reachable.has(step.id))
  const unconnected = candidates.filter(step => !index.reachable.has(step.id))
  const choose = (target: string | null) => {
    act('Change destination', setLink(stepId, port, target))
    setOpen(false)
  }
  const keepSelection = (run: () => void) => {
    const before = useEditor.getState().selection
    run()
    if (before.kind === 'item' || before.kind === 'element') useEditor.getState().select(before)
  }
  const row = (id: string) => (
    <button
      key={id}
      type="button"
      onClick={() => choose(id)}
      className={cn(
        'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100',
        direct === id && 'bg-indigo-50 text-indigo-900',
      )}
    >
      <span className="truncate">{stepName(doc, id)}</span>
    </button>
  )
  return (
    <Popover
      open={open}
      onOpenChange={next => {
        setOpen(next)
        if (!next) setRecipesOpen(false)
      }}
      trigger={
        <button
          type="button"
          aria-label={label ? `${label}: goes to ${current}` : `Goes to ${current}`}
          data-field={`link:${port}`}
          onClick={event => event.stopPropagation()}
          className={cn(
            'inline-flex max-w-full items-center gap-1 rounded-md border font-sans transition',
            compact
              ? 'border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[11px] leading-4 text-indigo-800 hover:bg-indigo-100'
              : 'h-9 w-full justify-between border-slate-300 bg-white px-2.5 text-sm text-slate-800 hover:bg-slate-50',
          )}
        >
          <span className="flex min-w-0 items-center gap-1">
            {compact ? <ArrowRight size={11} className="shrink-0" /> : null}
            {compact && label ? <span className="truncate font-medium">{label}</span> : null}
            {compact && label ? <span className="shrink-0">→</span> : null}
            <span className="truncate">{current}</span>
          </span>
          <ChevronDown size={compact ? 11 : 14} className="shrink-0 opacity-60" />
        </button>
      }
    >
      {recipesOpen ? (
        <div>
          <p className="px-2 pb-1 text-xs font-medium text-slate-500">New screen</p>
          {(recipes.data ?? []).map(recipe => (
            <PopoverClose asChild key={recipe.id}>
              <button
                type="button"
                className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100"
                onClick={() =>
                  keepSelection(() =>
                    act('Add screen', insertScreenOnLink(stepId, port, recipe as never, { name: recipe.name })),
                  )
                }
              >
                {recipe.name}
              </button>
            </PopoverClose>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {fallback === 'next' ? (
            <button
              type="button"
              onClick={() => choose(null)}
              className={cn(
                'flex w-full items-center rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100',
                !direct && 'bg-indigo-50 text-indigo-900',
              )}
            >
              Next screen (default)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => choose(null)}
              className={cn(
                'flex w-full items-center rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100',
                !direct && 'bg-indigo-50 text-indigo-900',
              )}
            >
              Ends here
            </button>
          )}
          {reachable.length ? <p className="px-2 pt-1 text-xs font-medium text-slate-500">Screens</p> : null}
          {reachable.map(step => row(step.id))}
          {unconnected.length ? <p className="px-2 pt-1 text-xs font-medium text-slate-500">Not connected</p> : null}
          {unconnected.map(step => row(step.id))}
          <div className="mt-1 border-t border-slate-200 pt-1">
            <button
              type="button"
              onClick={() => setRecipesOpen(true)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-indigo-700 hover:bg-slate-100"
            >
              <Plus size={14} /> New screen…
            </button>
            {allowCondition ? (
              <button
                type="button"
                onClick={() => {
                  act('Add condition', insertConditionOnLink(stepId, port))
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100"
              >
                <GitBranch size={14} /> Split with a condition…
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                act('Add redirect', insertRedirectOnLink(stepId, port))
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100"
            >
              <ExternalLink size={14} /> Redirect to a website…
            </button>
          </div>
        </div>
      )}
    </Popover>
  )
}
