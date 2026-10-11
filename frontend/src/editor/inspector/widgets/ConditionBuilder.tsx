import type { Condition } from '@journey/engine/conditions'
import type { JourneyDoc } from '@journey/model/types'
import { type Output, screenOutputs } from '@journey/ports'
import { stepName } from '@journey/summary'
import { LIMITS } from '@shared/limits.gen'
import { cn } from '@shared/ui/cn'
import { Plus, X } from 'lucide-react'
import { Select } from '../../ui/Select'

type Leaf = Exclude<Condition, { all: unknown } | { any: unknown }>

export interface AnswerSource {
  key: string
  label: string
  type: Output['type'] | 'device' | 'outcome' | 'score'
  options?: { id: string; label: string }[]
}

export function answerSources(doc: JourneyDoc): AnswerSource[] {
  const seen = new Set<string>()
  const out: AnswerSource[] = []
  for (const screen of Object.values(doc.screens ?? {})) {
    for (const output of screenOutputs(screen)) {
      if (seen.has(output.key)) continue
      seen.add(output.key)
      out.push({
        key: output.key,
        label: output.label,
        type: output.type,
        ...(output.options ? { options: output.options } : {}),
      })
    }
  }
  const hasPoints = Object.values(doc.screens ?? {}).some(screen =>
    (screen.elements ?? []).some(el => el.type === 'choice' && el.props.scoring === 'points'),
  )
  const hasOutcomes = Object.values(doc.screens ?? {}).some(screen =>
    (screen.elements ?? []).some(el => el.type === 'choice' && el.props.scoring === 'outcomes'),
  )
  if (hasPoints) out.push({ key: 'score', label: 'Score', type: 'score' })
  if (hasOutcomes)
    out.push({
      key: 'outcomes',
      label: 'Top result',
      type: 'outcome',
      options: Object.values(doc.screens ?? {}).map(screen => ({ id: screen.id, label: stepName(doc, screen.id) })),
    })
  out.push({ key: 'device', label: 'Device', type: 'device' })
  out.push({ key: 'utm_source', label: 'Link tracking · source', type: 'text' })
  out.push({ key: 'utm_campaign', label: 'Link tracking · campaign', type: 'text' })
  return out
}

const OPS: Record<string, { value: string; label: string }[]> = {
  text: [
    { value: 'equals', label: 'is' },
    { value: 'notEquals', label: 'is not' },
    { value: 'contains', label: 'contains' },
    { value: 'notContains', label: 'does not contain' },
    { value: 'isNotEmpty', label: 'is filled in' },
    { value: 'isEmpty', label: 'is empty' },
  ],
  number: [
    { value: 'eq', label: 'is' },
    { value: 'neq', label: 'is not' },
    { value: 'gt', label: 'is more than' },
    { value: 'gte', label: 'is at least' },
    { value: 'lt', label: 'is less than' },
    { value: 'lte', label: 'is at most' },
    { value: 'between', label: 'is between' },
  ],
  choice: [
    { value: 'anyOf', label: 'is any of' },
    { value: 'noneOf', label: 'is none of' },
  ],
  choices: [
    { value: 'includesAny', label: 'includes any of' },
    { value: 'includesAll', label: 'includes all of' },
    { value: 'includesNone', label: 'includes none of' },
  ],
  boolean: [
    { value: 'isTrue', label: 'is checked' },
    { value: 'isFalse', label: 'is not checked' },
  ],
  date: [
    { value: 'before', label: 'is before' },
    { value: 'after', label: 'is after' },
  ],
  device: [{ value: 'is', label: 'is' }],
  outcome: [{ value: 'topOutcome', label: 'is' }],
}

function opsFor(type: AnswerSource['type']) {
  if (type === 'rating' || type === 'score' || type === 'number') return OPS.number ?? []
  if (type === 'email' || type === 'phone') return OPS.text ?? []
  return OPS[type] ?? OPS.text ?? []
}

export function defaultLeaf(source: AnswerSource): Leaf {
  const op = opsFor(source.type)[0]?.value ?? 'isNotEmpty'
  if (source.type === 'device') return { answer: 'device', op: 'is', value: 'mobile' }
  if (source.type === 'outcome') return { answer: 'outcomes', op: 'topOutcome', value: source.options?.[0]?.id ?? '' }
  if (source.type === 'choice' || source.type === 'choices') return { answer: source.key, op, value: [] } as Leaf
  if (source.type === 'boolean') return { answer: source.key, op: 'isTrue' }
  if (source.type === 'date')
    return { answer: source.key, op: op as 'before', value: new Date().toISOString().slice(0, 10) }
  if (op === 'eq') return { answer: source.key, op: 'gte', value: 0 } as Leaf
  return { answer: source.key, op, value: '' } as Leaf
}

function leaves(condition: Condition | null | undefined): { mode: 'all' | 'any'; items: Leaf[] } {
  if (!condition) return { mode: 'all', items: [] }
  if ('all' in condition) return { mode: 'all', items: condition.all as Leaf[] }
  if ('any' in condition) return { mode: 'any', items: condition.any as Leaf[] }
  return { mode: 'all', items: [condition as Leaf] }
}

function compose(mode: 'all' | 'any', items: Leaf[]): Condition | null {
  if (items.length === 0) return null
  if (items.length === 1) return items[0] ?? null
  return mode === 'all' ? { all: items } : { any: items }
}

export function ConditionBuilder({
  doc,
  value,
  onChange,
  allowEmpty,
  emptyLabel,
}: {
  doc: JourneyDoc
  value: Condition | null | undefined
  onChange: (value: Condition | null) => void
  allowEmpty?: boolean
  emptyLabel?: string
}) {
  const sources = answerSources(doc)
  const { mode, items } = leaves(value)
  const update = (index: number, leaf: Leaf) =>
    onChange(
      compose(
        mode,
        items.map((item, i) => (i === index ? leaf : item)),
      ),
    )
  const remove = (index: number) => {
    const next = items.filter((_, i) => i !== index)
    if (next.length === 0 && !allowEmpty) return
    onChange(compose(mode, next))
  }
  const add = () => {
    const first = sources[0]
    if (first) onChange(compose(mode, [...items, defaultLeaf(first)]))
  }
  return (
    <div className="space-y-2" data-field="when">
      {items.length > 1 ? (
        <div className="flex items-center gap-2 text-xs text-slate-600">
          Match
          <Select
            aria-label="Match all or any"
            className="h-7 w-auto text-xs"
            value={mode}
            options={[
              { value: 'all', label: 'all of these' },
              { value: 'any', label: 'any of these' },
            ]}
            onChange={event => onChange(compose(event.target.value as 'all' | 'any', items))}
          />
        </div>
      ) : null}
      {items.length === 0 ? <p className="text-xs text-slate-500">{emptyLabel ?? 'Always'}</p> : null}
      {items.map((leaf, index) => (
        <LeafRow
          key={`${leaf.answer ?? ''}-${index.toString()}`}
          leaf={leaf}
          sources={sources}
          onChange={next => update(index, next)}
          onRemove={items.length > 1 || allowEmpty ? () => remove(index) : undefined}
        />
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
      >
        <Plus size={12} /> {items.length === 0 ? 'Add a rule' : 'And another rule'}
      </button>
    </div>
  )
}

function LeafRow({
  leaf,
  sources,
  onChange,
  onRemove,
}: {
  leaf: Leaf
  sources: AnswerSource[]
  onChange: (leaf: Leaf) => void
  onRemove: (() => void) | undefined
}) {
  const key = leaf.answer ?? (leaf.op === 'topOutcome' ? 'outcomes' : leaf.op === 'is' ? 'device' : '')
  const source = sources.find(s => s.key === key)
  const ops = opsFor(source?.type ?? 'text')
  const raw = leaf as unknown as { value?: unknown; value2?: unknown }
  const set = (patch: Record<string, unknown>) => onChange({ ...leaf, ...patch } as Leaf)
  return (
    <div className="space-y-1.5 rounded-md border border-slate-200 bg-slate-50 p-2">
      <div className="flex items-center gap-1">
        <Select
          aria-label="Saved answer"
          className="h-8 text-xs"
          value={key}
          options={[
            ...(source ? [] : [{ value: key, label: key ? `Missing answer · ${key}` : 'Choose a saved answer' }]),
            ...sources.map(s => ({ value: s.key, label: s.label })),
          ]}
          onChange={event => {
            const next = sources.find(s => s.key === event.target.value)
            if (next) onChange(defaultLeaf(next))
          }}
        />
        {onRemove ? (
          <button
            type="button"
            aria-label="Remove rule"
            onClick={onRemove}
            className="rounded p-1 text-slate-400 hover:text-rose-600"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
      <Select
        aria-label="Comparison"
        className="h-8 text-xs"
        value={leaf.op}
        options={ops}
        onChange={event => {
          const op = event.target.value
          const patch: Record<string, unknown> = { op }
          if (op === 'isEmpty' || op === 'isNotEmpty' || op === 'isTrue' || op === 'isFalse') patch.value = undefined
          set(patch)
        }}
      />
      {source?.options && (source.type === 'choice' || source.type === 'choices') ? (
        <div className="flex flex-wrap gap-1">
          {source.options.map(option => {
            const values = Array.isArray(raw.value) ? (raw.value as string[]) : []
            const on = values.includes(option.id)
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={on}
                onClick={() => set({ value: on ? values.filter(v => v !== option.id) : [...values, option.id] })}
                className={cn(
                  'rounded-full border px-2 py-0.5 text-xs',
                  on ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-700',
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      ) : source?.type === 'outcome' ? (
        <Select
          aria-label="Result screen"
          className="h-8 text-xs"
          value={String(raw.value ?? '')}
          options={(source.options ?? []).map(option => ({ value: option.id, label: option.label }))}
          onChange={event => set({ value: event.target.value })}
        />
      ) : source?.type === 'device' ? (
        <Select
          aria-label="Device"
          className="h-8 text-xs"
          value={String(raw.value ?? 'mobile')}
          options={[
            { value: 'mobile', label: 'Mobile' },
            { value: 'tablet', label: 'Tablet' },
            { value: 'desktop', label: 'Desktop' },
          ]}
          onChange={event => set({ value: event.target.value })}
        />
      ) : leaf.op === 'isEmpty' ||
        leaf.op === 'isNotEmpty' ||
        leaf.op === 'isTrue' ||
        leaf.op === 'isFalse' ? null : source?.type === 'date' ? (
        <input
          type="date"
          aria-label="Date"
          value={String(raw.value ?? '').slice(0, 10)}
          onChange={event => set({ value: event.target.value })}
          className="h-8 w-full rounded border border-slate-300 px-2 text-xs"
        />
      ) : ops === OPS.number ? (
        <div className="flex items-center gap-1">
          <input
            type="number"
            aria-label="Value"
            value={typeof raw.value === 'number' ? raw.value : ''}
            onChange={event => set({ value: event.target.value === '' ? null : Number(event.target.value) })}
            className="h-8 w-full rounded border border-slate-300 px-2 text-xs"
          />
          {leaf.op === 'between' ? (
            <>
              <span className="text-xs text-slate-500">and</span>
              <input
                type="number"
                aria-label="Second value"
                value={typeof raw.value2 === 'number' ? raw.value2 : ''}
                onChange={event => set({ value2: event.target.value === '' ? null : Number(event.target.value) })}
                className="h-8 w-full rounded border border-slate-300 px-2 text-xs"
              />
            </>
          ) : null}
        </div>
      ) : (
        <input
          type="text"
          aria-label="Value"
          maxLength={LIMITS.short_answer}
          value={String(raw.value ?? '')}
          onChange={event => set({ value: event.target.value })}
          className="h-8 w-full rounded border border-slate-300 px-2 text-xs"
        />
      )}
    </div>
  )
}
