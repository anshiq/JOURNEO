import { ExperienceRoot, ScreenView } from '@experience/index'
import { buildIndex, firstScreen } from '@journey/analysis'
import type { JourneyDoc } from '@journey/model/types'
import { outline } from '@journey/outline'
import { cn } from '@shared/ui/cn'
import { useMemo, useState } from 'react'
import { useTemplates } from '../queries/library'
import type { Goal, TemplateItem } from '../queries/types'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

const noop = () => undefined
const EMPTY = {}

function templateDoc(template: TemplateItem, color: string | undefined): JourneyDoc {
  if (!color) return template.doc
  return {
    ...template.doc,
    theme: { ...(template.doc.theme ?? {}), colors: { ...(template.doc.theme?.colors ?? {}), primary: color } },
  }
}

function Stage({
  doc,
  screenId,
  isFirst,
  className,
}: {
  doc: JourneyDoc
  screenId: string
  isFirst: boolean
  className: string
}) {
  return (
    <div
      className={cn('pointer-events-none overflow-hidden rounded-md border border-slate-200 bg-white', className)}
      style={{ contain: 'strict' }}
    >
      <div style={{ width: 390, transform: 'scale(0.5)', transformOrigin: 'top left' }}>
        <ExperienceRoot theme={doc.theme} breakpoint="mobile">
          {bp => (
            <ScreenView
              doc={doc}
              screenId={screenId}
              vars={EMPTY}
              breakpoint={bp}
              mode="thumbnail"
              isFirst={isFirst}
              onExit={noop}
            />
          )}
        </ExperienceRoot>
      </div>
    </div>
  )
}

function Thumb({ template, color }: { template: TemplateItem; color?: string | undefined }) {
  const doc = useMemo(() => templateDoc(template, color), [template, color])
  const screenId = useMemo(() => firstScreen(buildIndex(doc)), [doc])
  if (!screenId) return <div className="h-44 rounded-md border border-slate-200 bg-white" />
  return <Stage doc={doc} screenId={screenId} isFirst className="h-44" />
}

function PreviewDialog({
  template,
  color,
  onUse,
  onOpenChange,
}: {
  template: TemplateItem
  color: string | undefined
  onUse: () => void
  onOpenChange: (open: boolean) => void
}) {
  const doc = useMemo(() => templateDoc(template, color), [template, color])
  const screenIds = useMemo(
    () =>
      outline(doc, buildIndex(doc))
        .map(row => row.stepId)
        .filter(stepId => Boolean(doc.screens?.[stepId]))
        .slice(0, 6),
    [doc],
  )
  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title={template.name}
      description={template.description}
      wide
      footer={
        <Button
          variant="primary"
          onClick={() => {
            onUse()
            onOpenChange(false)
          }}
        >
          Use this template
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {screenIds.map((screenId, index) => (
          <Stage key={screenId} doc={doc} screenId={screenId} isFirst={index === 0} className="h-[26rem]" />
        ))}
      </div>
    </Dialog>
  )
}

function TemplateCard({
  template,
  color,
  selected,
  onSelect,
  onPreview,
}: {
  template: TemplateItem
  color: string | undefined
  selected: boolean
  onSelect: () => void
  onPreview: () => void
}) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className={cn(
          'block w-full space-y-2 rounded-lg border p-2 text-left transition',
          selected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-indigo-300',
        )}
      >
        <Thumb template={template} color={color} />
        <div>
          <p className="text-sm font-medium">{template.name}</p>
          {template.description ? <p className="line-clamp-2 text-xs text-slate-500">{template.description}</p> : null}
        </div>
      </button>
      <Button size="sm" aria-label={`Preview ${template.name}`} onClick={onPreview}>
        Preview
      </Button>
    </div>
  )
}

export function TemplateGallery({
  value,
  onChange,
  goal,
  color,
}: {
  value: string | null
  onChange: (id: string) => void
  goal: Goal | null
  color?: string | undefined
}) {
  const templates = useTemplates()
  const [previewing, setPreviewing] = useState<TemplateItem | null>(null)
  if (templates.isPending) return <p className="text-sm text-slate-500">Loading templates…</p>
  const items = [...(templates.data ?? [])].sort((a, b) => Number(b.goal === goal) - Number(a.goal === goal))
  const mine = items.filter(template => template.source === 'user')
  const starters = items.filter(template => template.source !== 'user')
  const renderGroup = (title: string, group: TemplateItem[]) => (
    <section className="space-y-2">
      <p className="text-xs font-medium text-slate-700">{title}</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3" role="radiogroup" aria-label={title}>
        {group.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            color={color}
            selected={value === template.id}
            onSelect={() => onChange(template.id)}
            onPreview={() => setPreviewing(template)}
          />
        ))}
      </div>
    </section>
  )
  return (
    <div className="space-y-5">
      {mine.length > 0 ? renderGroup('My templates', mine) : null}
      {starters.length > 0 ? renderGroup('Starter templates', starters) : null}
      {previewing ? (
        <PreviewDialog
          template={previewing}
          color={color}
          onUse={() => onChange(previewing.id)}
          onOpenChange={open => {
            if (!open) setPreviewing(null)
          }}
        />
      ) : null}
    </div>
  )
}
