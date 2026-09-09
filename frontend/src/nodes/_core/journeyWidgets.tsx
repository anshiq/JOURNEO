import * as React from 'react'
import { Smartphone, Tablet, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Breakpoint, ResponsiveOverride } from './types'

const TABS: { key: Breakpoint; label: string; icon: React.ElementType }[] = [
  { key: 'mobile', label: 'Mobile', icon: Smartphone },
  { key: 'tablet', label: 'Tablet', icon: Tablet },
  { key: 'desktop', label: 'Desktop', icon: Monitor },
]

export function BreakpointTabs<T extends Record<string, any>>({
  responsive,
  onChange,
  renderFields,
}: {
  base: T
  responsive?: ResponsiveOverride<T>
  onChange: (next: ResponsiveOverride<T> | undefined) => void
  renderFields: (value: Partial<T>, set: (patch: Partial<T>) => void, isBase: boolean) => React.ReactNode
}) {
  const [active, setActive] = React.useState<Breakpoint>('mobile')

  const setOverride = (bp: Breakpoint, patch: Partial<T>) => {
    const next: ResponsiveOverride<T> = { ...(responsive || {}) }
    next[bp] = { ...(next[bp] || {}), ...patch }
    onChange(next)
  }

  const clearOverride = (bp: Breakpoint) => {
    const next: ResponsiveOverride<T> = { ...(responsive || {}) }
    delete next[bp]
    onChange(Object.keys(next).length > 0 ? next : undefined)
  }

  return (
    <div className="space-y-2 rounded-none border bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Per-device overrides</div>
      <div className="grid grid-flow-col auto-cols-fr gap-1 rounded-none border bg-muted/30 p-0.5">
        {TABS.map(t => {
          const Icon = t.icon
          const hasOverride = Boolean((responsive || {})[t.key])
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={cn(
                'flex items-center justify-center gap-1 rounded-none px-2 py-1 text-[11px] transition-colors',
                active === t.key ? 'bg-background text-foreground shadow-none' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3 w-3" />
              {t.label}
              {hasOverride && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </button>
          )
        })}
      </div>
      <div className="space-y-2">
        {renderFields(
          (responsive || {})[active] || {},
          patch => setOverride(active, patch),
          false,
        )}
        {Boolean((responsive || {})[active]) && (
          <button
            type="button"
            onClick={() => clearOverride(active)}
            className="text-[10px] text-muted-foreground underline-offset-2 hover:underline"
          >
            Clear {TABS.find(t => t.key === active)?.label} override (fall back to base)
          </button>
        )}
      </div>
    </div>
  )
}

export default BreakpointTabs
