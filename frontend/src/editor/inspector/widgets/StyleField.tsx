import { resolveStyle } from '@experience/index'
import type { Element, StyleProps } from '@journey/model/types'
import { resetOverride, type Scope, setStyle } from '@journey/ops/index'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useEditor } from '../../store'
import { act } from '../../store/commands'
import { Menu } from '../../ui/Menu'

const SCOPE_LABEL: Record<Scope, string> = {
  all: 'All devices',
  mobileOnly: 'Mobile only',
  tabletUp: 'Tablet & desktop',
  desktopOnly: 'Desktop only',
}

export function useStyleScope(): [Scope, (scope: Scope) => void] {
  return useState<Scope>('all')
}

export function StyleField<K extends keyof StyleProps>({
  element,
  prop,
  label,
  render,
}: {
  element: Element
  prop: K
  label: string
  render: (value: StyleProps[K] | null | undefined, set: (value: StyleProps[K] | null) => void) => React.ReactNode
}) {
  const [scope, setScope] = useState<Scope>('all')
  const breakpoint = useEditor(state => state.breakpoint)
  const resolved = resolveStyle(element, breakpoint) as StyleProps
  const tablet = element.responsive?.tablet?.style?.[prop]
  const desktop = element.responsive?.desktop?.style?.[prop]
  const overridden: ('tablet' | 'desktop')[] = []
  if (tablet !== undefined) overridden.push('tablet')
  if (desktop !== undefined) overridden.push('desktop')
  const set = (value: StyleProps[K] | null) =>
    act(
      `Change ${label.toLowerCase()}`,
      setStyle(element.id, prop, value ?? undefined, scope),
      `style:${element.id}:${prop}:${scope}`,
    )
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-700">{label}</span>
        <span className="flex items-center gap-1">
          {overridden.length ? (
            <button
              type="button"
              className="rounded bg-amber-50 px-1.5 text-[11px] text-amber-800 hover:bg-amber-100"
              title="Remove device adjustments for this setting"
              onClick={() => {
                for (const device of overridden) act('Reset device adjustment', resetOverride(element.id, prop, device))
              }}
            >
              {overridden.length === 2 ? 'Tablet & desktop' : overridden[0] === 'tablet' ? 'Tablet up' : 'Desktop'} ·
              Reset
            </button>
          ) : null}
          <Menu
            trigger={
              <button
                type="button"
                aria-label={`${label} applies to ${SCOPE_LABEL[scope]}`}
                className="inline-flex items-center gap-0.5 rounded px-1 text-[11px] text-slate-500 hover:bg-slate-100"
              >
                {SCOPE_LABEL[scope]} <ChevronDown size={11} />
              </button>
            }
            items={(Object.keys(SCOPE_LABEL) as Scope[]).map(value => ({
              label: SCOPE_LABEL[value],
              onSelect: () => setScope(value),
            }))}
          />
        </span>
      </div>
      {render(resolved[prop], set)}
    </div>
  )
}
