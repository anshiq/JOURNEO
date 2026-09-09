import * as React from 'react'
import type { DeviceProps } from '../_core/device'
import { applyStyle } from '../_core/preview'

function shuffled<T>(arr: T[], seed: string): T[] {
  const out = [...arr]
  let s = seed.length
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = Math.floor((s / 233280) * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export const QuizDevice: React.FC<DeviceProps> = ({ config, theme, style, value, onChange, onAdvance, blockId }) => {
  const cfg = config || {}
  const multiple = cfg.type === 'multiple'
  const selected: string[] = multiple ? (Array.isArray(value) ? value : []) : (value ? [value] : [])
  const applied = applyStyle(style || {})
  const [showFeedback, setShowFeedback] = React.useState(false)
  const options = React.useMemo(() => cfg.randomizeOrder ? shuffled(cfg.options || [], blockId) : (cfg.options || []), [cfg.options, cfg.randomizeOrder, blockId])
  const choose = (id: string) => {
    const next = multiple ? (selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]) : id
    onChange?.(next)
    if (cfg.showFeedback) setShowFeedback(true)
    if (cfg.submitMode !== 'collect' && !cfg.showFeedback) onAdvance('answered', cfg.blockKey ? { [cfg.blockKey]: next } : undefined)
  }
  const isCorrect = (id: string) => Boolean(options.find((o: any) => o.id === id)?.correct)
  return <div className="w-full min-w-0 max-w-full p-4 sm:p-5" style={{ maxWidth: '100%', boxSizing: 'border-box' }}><p className="mb-4 min-w-0 break-words font-medium" style={{ fontFamily: theme.font, fontSize: (applied as any).fontSize || (style as any).fontSize || 'clamp(1rem, 0.9rem + 0.5vw, 1.125rem)', lineHeight: 1.5, overflowWrap: 'break-word', wordBreak: 'break-word' }}>{cfg.question}</p><div className="mb-4 flex min-w-0 max-w-full flex-col gap-2">{options.map((option: any) => {
    const isSelected = selected.includes(option.id)
    const feedbackColor = showFeedback && isSelected ? (option.correct ? '#16a34a' : '#dc2626') : undefined
    return <button key={option.id} type="button" onClick={e => { e.stopPropagation(); choose(option.id) }} className="min-h-[48px] w-full min-w-0 max-w-full whitespace-normal break-words border px-4 py-3 text-left text-sm transition hover:opacity-90 sm:text-base" style={{ borderRadius: theme.radius, fontFamily: theme.font, borderColor: feedbackColor || (isSelected ? theme.primary : theme.primary + '40'), backgroundColor: feedbackColor ? feedbackColor + '14' : isSelected ? theme.primary + '14' : 'transparent', overflowWrap: 'break-word', wordBreak: 'break-word', lineHeight: 1.45 }}>{option.label}</button>
  })}</div>
    {showFeedback && <div className="mb-3 text-sm" style={{ color: selected.some(isCorrect) ? '#16a34a' : '#dc2626' }}>{selected.some(isCorrect) ? 'Correct!' : 'Not quite.'}</div>}
    {(cfg.submitMode === 'collect' || showFeedback) && selected.length > 0 && cfg.blockOwnsExit && <button type="button" onClick={() => onAdvance('answered', cfg.blockKey ? { [cfg.blockKey]: multiple ? selected : selected[0] } : undefined)} className="min-h-[48px] w-full min-w-0 max-w-full break-words py-2 text-sm text-white sm:text-base" style={{ backgroundColor: theme.primary, borderRadius: theme.radius }}>{cfg.submitLabel || 'Continue'}</button>}
    {cfg.allowSkip && <button type="button" onClick={e => { e.stopPropagation(); onAdvance('skipped') }} className="mt-2 min-h-[44px] w-full min-w-0 max-w-full break-words text-xs opacity-60 sm:text-sm">{cfg.skipLabel || 'Skip question'}</button>}
  </div>
}
export default QuizDevice
