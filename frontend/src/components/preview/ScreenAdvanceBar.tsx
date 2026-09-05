import * as React from 'react'
import type { LiveSessionClient } from '../../lib/liveSession'

export default function ScreenAdvanceBar({ theme, screen, missing, isValid, onAdvance, onBack, advanceLabel, backLabel, disabledHint }: {
  theme: any
  screen: any
  missing: string[]
  isValid: boolean
  onAdvance: () => void
  onBack: () => void
  advanceLabel: string
  backLabel: string
  disabledHint?: string
}) {
  const advance = screen.advance || {}
  const mode = advance.mode || 'button'
  const disabled = mode === 'button' && advance.requireValid && !isValid
  const hint = disabledHint || (missing.length > 0 ? `Complete: ${missing.join(', ')}` : undefined)
  const buttonClass = advance.fullWidth === false ? 'px-5' : 'flex-1'
  const buttonStyle = advance.variant === 'outline' ? { backgroundColor: 'transparent', color: theme.primary, border: `1px solid ${theme.primary}` } : advance.variant === 'ghost' ? { backgroundColor: 'transparent', color: theme.primary } : { backgroundColor: theme.primary, color: 'white' }
  if (mode !== 'button' && !screen.back?.show) return null
  return (
    <div className="sticky bottom-0 z-10 -mx-2 mt-2 border-t bg-card/95 px-2 py-2 backdrop-blur" style={{ borderColor: theme.primary + '33' }}>
      <div className="flex gap-2">
        {screen.back?.show && (
          <button onClick={onBack} className="flex-1 border py-2 text-sm font-medium opacity-80" style={{ borderRadius: theme.radius, fontFamily: theme.font, borderColor: `${theme.primary}66`, color: theme.foreground }}>{backLabel}</button>
        )}
        {mode === 'button' && (
          <button
            disabled={disabled}
            onClick={onAdvance}
            aria-describedby={hint ? 'advance-hint' : undefined}
            className={`${buttonClass} py-2 text-sm font-medium disabled:opacity-50`}
            style={{ ...buttonStyle, borderRadius: theme.radius, fontFamily: theme.font }}
          >
            {advanceLabel}
          </button>
        )}
      </div>
      {hint && <div id="advance-hint" className="mt-1 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  )
}
