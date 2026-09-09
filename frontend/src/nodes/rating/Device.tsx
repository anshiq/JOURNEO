import * as React from 'react'
import type { DeviceProps } from '../_core/device'

export const RatingDevice: React.FC<DeviceProps> = ({ config, theme, value, onChange }) => {
  const cfg = config || {}
  const max = Math.max(1, Math.min(20, Number(cfg.max || 5)))
  const current = Number(value ?? cfg.defaultValue ?? cfg.value ?? 0)
  return (
    <div className="w-full min-w-0 max-w-full" style={{ fontFamily: theme.font, maxWidth: '100%' }} onClick={e => e.stopPropagation()}>
      {cfg.label && <div className="mb-1 min-w-0 break-words text-xs font-medium sm:text-sm" style={{ overflowWrap: 'break-word' }}>{cfg.label}</div>}
      <div className="flex min-w-0 max-w-full flex-wrap gap-1" role="radiogroup" aria-label={cfg.label || 'Rating'}>
        {Array.from({ length: max }, (_, i) => {
          const score = i + 1
          const active = score <= current
          return <button key={score} type="button" role="radio" aria-checked={active} aria-label={`${score} of ${max}`} onClick={() => onChange?.(score)} className="flex min-h-[44px] min-w-[44px] items-center justify-center text-2xl leading-none" style={{ color: active ? theme.accent : theme.primary + '40' }}>★</button>
        })}
      </div>
    </div>
  )
}
export default RatingDevice
