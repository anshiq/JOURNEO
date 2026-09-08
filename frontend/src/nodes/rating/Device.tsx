import * as React from 'react'
import type { DeviceProps } from '../_core/device'

export const RatingDevice: React.FC<DeviceProps> = ({ config, theme, value, onChange }) => {
  const cfg = config || {}
  const max = Math.max(1, Number(cfg.max || 5))
  const current = Number(value ?? cfg.defaultValue ?? cfg.value ?? 0)
  return (
    <div className="w-full" style={{ fontFamily: theme.font }} onClick={e => e.stopPropagation()}>
      {cfg.label && <div className="mb-1 text-xs font-medium">{cfg.label}</div>}
      <div className="flex gap-1" role="radiogroup" aria-label={cfg.label || 'Rating'}>
        {Array.from({ length: max }, (_, i) => {
          const score = i + 1
          const active = score <= current
          return <button key={score} type="button" role="radio" aria-checked={active} aria-label={`${score} of ${max}`} onClick={() => onChange?.(score)} className="text-lg leading-none" style={{ color: active ? theme.accent : theme.primary + '40' }}>★</button>
        })}
      </div>
    </div>
  )
}
