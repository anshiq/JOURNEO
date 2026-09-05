import * as React from 'react'
import type { ThemeConfig } from '../../nodes/_core/types'
import { THEME_PRESETS } from '../../lib/journeyGraph'
import { Card } from '../ui/Card'

const fieldClass =
  'w-full border border-border/60 bg-background px-1.5 py-1 text-[11px] text-foreground/80 focus:border-foreground focus:outline-none'
const labelClass = 'mb-0.5 block text-[10px] uppercase tracking-wide text-muted-foreground'

export default function JourneyStylePanel({
  theme,
  onChange,
  readOnly,
}: {
  theme: ThemeConfig
  onChange: (next: ThemeConfig) => void
  readOnly?: boolean
}) {
  const set = <K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) => {
    if (readOnly) return
    onChange({ ...theme, [key]: value })
  }
  return (
    <Card className="flex flex-col gap-2 p-2 text-[11px]">
      <div className="text-eyebrow text-muted-foreground">Journey style</div>
      <div>
        <span className={labelClass}>Preset</span>
        <div className="flex gap-1">
          {Object.entries(THEME_PRESETS).map(([name, preset]) => (
            <button
              key={name}
              type="button"
              disabled={readOnly}
              onClick={() => onChange({ ...preset })}
              className="flex-1 border border-border/60 px-1.5 py-1 text-[11px] hover:border-foreground disabled:opacity-50"
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className={labelClass}>Primary</span>
          <input
            type="color"
            className="h-7 w-full border border-border/60 bg-background"
            value={theme.primary}
            disabled={readOnly}
            onChange={(e) => set('primary', e.target.value)}
          />
        </div>
        <div>
          <span className={labelClass}>Accent</span>
          <input
            type="color"
            className="h-7 w-full border border-border/60 bg-background"
            value={theme.accent}
            disabled={readOnly}
            onChange={(e) => set('accent', e.target.value)}
          />
        </div>
        <div>
          <span className={labelClass}>Surface</span>
          <input
            type="color"
            className="h-7 w-full border border-border/60 bg-background"
            value={theme.surface}
            disabled={readOnly}
            onChange={(e) => set('surface', e.target.value)}
          />
        </div>
        <div>
          <span className={labelClass}>Foreground</span>
          <input
            type="color"
            className="h-7 w-full border border-border/60 bg-background"
            value={theme.foreground}
            disabled={readOnly}
            onChange={(e) => set('foreground', e.target.value)}
          />
        </div>
      </div>
      <div>
        <span className={labelClass}>Font</span>
        <input
          className={fieldClass}
          value={theme.font}
          disabled={readOnly}
          onChange={(e) => set('font', e.target.value)}
        />
      </div>
      <div>
        <span className={labelClass}>Radius ({theme.radius}px)</span>
        <input
          type="range"
          min={0}
          max={32}
          className="w-full"
          value={theme.radius}
          disabled={readOnly}
          onChange={(e) => set('radius', Number(e.target.value))}
        />
      </div>
      <div>
        <span className={labelClass}>Default CTA label</span>
        <input
          className={fieldClass}
          value={theme.cta}
          disabled={readOnly}
          onChange={(e) => set('cta', e.target.value)}
        />
      </div>
    </Card>
  )
}
