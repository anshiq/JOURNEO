import * as React from 'react'
import type { DeviceProps } from '../_core/device'
import { applyStyle } from '../_core/preview'

export const QuizDevice: React.FC<DeviceProps> = ({ config, theme, style, value, onChange, onAdvance }) => {
  const cfg = config || {}
  const multiple = cfg.type === 'multiple'
  const selected: string[] = multiple ? (Array.isArray(value) ? value : []) : (value ? [value] : [])
  const applied = applyStyle(style || {})
  const choose = (id: string) => {
    const next = multiple ? (selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]) : id
    onChange?.(next)
    if (cfg.submitMode !== 'collect') onAdvance('answered', cfg.blockKey ? { [cfg.blockKey]: next } : undefined)
  }
  return <div className="w-full min-w-0 max-w-full p-4 sm:p-5" style={{ maxWidth: '100%', boxSizing: 'border-box' }}><p className="mb-4 min-w-0 break-words font-medium" style={{ fontFamily: theme.font, fontSize: (applied as any).fontSize || (style as any).fontSize || 'clamp(1rem, 0.9rem + 0.5vw, 1.125rem)', lineHeight: 1.5, overflowWrap: 'break-word', wordBreak: 'break-word' }}>{cfg.question}</p><div className="mb-4 flex min-w-0 max-w-full flex-col gap-2">{(cfg.options || []).map((option: any) => <button key={option.id} type="button" onClick={e => { e.stopPropagation(); choose(option.id) }} className="min-h-[48px] w-full min-w-0 max-w-full whitespace-normal break-words border px-4 py-3 text-left text-sm transition hover:opacity-90 sm:text-base" style={{ borderRadius: theme.radius, fontFamily: theme.font, borderColor: selected.includes(option.id) ? theme.primary : theme.primary + '40', backgroundColor: selected.includes(option.id) ? theme.primary + '14' : 'transparent', overflowWrap: 'break-word', wordBreak: 'break-word', lineHeight: 1.45 }}>{option.label}</button>)}</div>{cfg.submitMode === 'collect' && selected.length > 0 && cfg.blockOwnsExit && <button type="button" onClick={() => onAdvance('answered', cfg.blockKey ? { [cfg.blockKey]: multiple ? selected : selected[0] } : undefined)} className="min-h-[48px] w-full min-w-0 max-w-full break-words py-2 text-sm text-white sm:text-base" style={{ backgroundColor: theme.primary, borderRadius: theme.radius }}>{cfg.submitLabel || 'Submit'}</button>}{cfg.allowSkip && <button type="button" onClick={e => { e.stopPropagation(); onAdvance('skipped') }} className="mt-2 min-h-[44px] w-full min-w-0 max-w-full break-words text-xs opacity-60 sm:text-sm">{cfg.skipLabel || 'Skip question'}</button>}</div>
}
export default QuizDevice
