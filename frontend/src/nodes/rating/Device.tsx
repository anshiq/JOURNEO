import * as React from 'react'
import type { DeviceProps } from '../_core/device'

const ICONS: Record<string, string> = { star: '★', heart: '♥', thumb: '👍' }

export const RatingDevice: React.FC<DeviceProps> = ({ config, theme, value, onChange }) => {
  const cfg = config || {}
  const max = Math.max(1, Math.min(20, Number(cfg.max || 5)))
  const current = Number(value ?? cfg.defaultValue ?? cfg.value ?? 0)
  const glyph = ICONS[cfg.icon || 'star'] || ICONS.star
  const readOnly = Boolean(cfg.readOnly)
  const setScore = (score: number) => { if (!readOnly) onChange?.(score) }
  return (
    <div className="w-full min-w-0 max-w-full" style={{ fontFamily: theme.font, maxWidth: '100%' }} onClick={e => e.stopPropagation()}>
      {cfg.label && <div className="mb-1 min-w-0 break-words text-xs font-medium sm:text-sm" style={{ overflowWrap: 'break-word' }}>{cfg.label}</div>}
      <div className="flex min-w-0 max-w-full flex-wrap gap-1" role="radiogroup" aria-label={cfg.label || 'Rating'}>
        {Array.from({ length: max }, (_, i) => {
          const score = i + 1
          const full = score <= Math.floor(current)
          const half = cfg.allowHalf && !full && score - 0.5 <= current
          if (cfg.allowHalf) {
            return (
              <div key={score} className="relative flex min-h-[44px] min-w-[44px] items-center justify-center text-2xl leading-none" style={{ color: full || half ? theme.accent : theme.primary + '40' }}>
                <span aria-hidden style={{ position: 'absolute', overflow: 'hidden', width: half ? '50%' : full ? '100%' : '0%', color: theme.accent }}>{glyph}</span>
                <span aria-hidden style={{ opacity: full || half ? 0 : 1 }}>{glyph}</span>
                {!readOnly && <>
                  <button type="button" aria-label={`${score - 0.5} of ${max}`} onClick={() => setScore(score - 0.5)} className="absolute left-0 top-0 h-full w-1/2" />
                  <button type="button" aria-label={`${score} of ${max}`} onClick={() => setScore(score)} className="absolute right-0 top-0 h-full w-1/2" />
                </>}
              </div>
            )
          }
          return <button key={score} type="button" role="radio" aria-checked={full} aria-label={`${score} of ${max}`} disabled={readOnly} onClick={() => setScore(score)} className="flex min-h-[44px] min-w-[44px] items-center justify-center text-2xl leading-none disabled:cursor-default" style={{ color: full ? theme.accent : theme.primary + '40' }}>{glyph}</button>
        })}
      </div>
    </div>
  )
}
export default RatingDevice
