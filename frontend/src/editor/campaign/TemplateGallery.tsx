import { ExperienceRoot, ScreenView } from '@experience/index'
import { buildIndex, firstScreen } from '@journey/analysis'
import { cn } from '@shared/ui/cn'
import { useMemo } from 'react'
import { useTemplates } from '../queries/library'
import type { Goal, TemplateItem } from '../queries/types'

const noop = () => undefined
const EMPTY = {}

function Thumb({ template, color }: { template: TemplateItem; color?: string | undefined }) {
  const doc = useMemo(() => {
    if (!color) return template.doc
    return {
      ...template.doc,
      theme: { ...(template.doc.theme ?? {}), colors: { ...(template.doc.theme?.colors ?? {}), primary: color } },
    }
  }, [template.doc, color])
  const screenId = useMemo(() => firstScreen(buildIndex(doc)), [doc])
  return (
    <div
      className="pointer-events-none h-44 overflow-hidden rounded-md border border-slate-200 bg-white"
      style={{ contain: 'strict' }}
    >
      <div style={{ width: 390, transform: 'scale(0.5)', transformOrigin: 'top left' }}>
        {screenId ? (
          <ExperienceRoot theme={doc.theme} breakpoint="mobile">
            {bp => (
              <ScreenView
                doc={doc}
                screenId={screenId}
                vars={EMPTY}
                breakpoint={bp}
                mode="thumbnail"
                isFirst
                onExit={noop}
              />
            )}
          </ExperienceRoot>
        ) : null}
      </div>
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
  const items = [...(templates.data ?? [])].sort((a, b) => Number(b.goal === goal) - Number(a.goal === goal))
  if (templates.isPending) return <p className="text-sm text-slate-500">Loading templates…</p>
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3" role="radiogroup" aria-label="Templates">
      {items.map(template => (
        <button
          key={template.id}
          type="button"
          role="radio"
          aria-checked={value === template.id}
          onClick={() => onChange(template.id)}
          className={cn(
            'space-y-2 rounded-lg border p-2 text-left transition',
            value === template.id
              ? 'border-indigo-500 ring-2 ring-indigo-200'
              : 'border-slate-200 hover:border-indigo-300',
          )}
        >
          <Thumb template={template} color={color} />
          <div>
            <p className="text-sm font-medium">
              {template.name}
              {template.source === 'user' ? (
                <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] text-slate-600">Mine</span>
              ) : null}
            </p>
            {template.description ? (
              <p className="line-clamp-2 text-xs text-slate-500">{template.description}</p>
            ) : null}
          </div>
        </button>
      ))}
    </div>
  )
}
