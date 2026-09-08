import * as React from 'react'
import type { DeviceProps } from '../_core/device'

export const QuizDevice: React.FC<DeviceProps> = ({ config, theme, style, value, onChange, onAdvance }) => {
  const cfg = config || {}
  const multiple = cfg.type === 'multiple'
  const selected: string[] = multiple ? (Array.isArray(value) ? value : []) : (value ? [value] : [])
  const choose = (id: string) => {
    const next = multiple ? (selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]) : id
    onChange?.(next)
    if (cfg.submitMode !== 'collect') onAdvance('answered', cfg.blockKey ? { [cfg.blockKey]: next } : undefined)
  }
  return <div className="p-4"><p className="mb-4 font-medium" style={{ fontFamily: theme.font, fontSize: (style as any).fontSize || '16px' }}>{cfg.question}</p><div className="mb-4 flex flex-col gap-2">{(cfg.options || []).map((option: any) => <button key={option.id} type="button" onClick={e => { e.stopPropagation(); choose(option.id) }} className="border px-4 py-3 text-left text-sm transition hover:opacity-90" style={{ borderRadius: theme.radius, fontFamily: theme.font, borderColor: selected.includes(option.id) ? theme.primary : theme.primary + '40', backgroundColor: selected.includes(option.id) ? theme.primary + '14' : 'transparent' }}>{option.label}</button>)}</div>{cfg.submitMode === 'collect' && selected.length > 0 && cfg.blockOwnsExit && <button type="button" onClick={() => onAdvance('answered', cfg.blockKey ? { [cfg.blockKey]: multiple ? selected : selected[0] } : undefined)} className="w-full py-2 text-sm text-white" style={{ backgroundColor: theme.primary, borderRadius: theme.radius }}>Submit</button>}{cfg.allowSkip && <button type="button" onClick={e => { e.stopPropagation(); onAdvance('skipped') }} className="w-full text-xs opacity-60">{cfg.skipLabel || 'Skip question'}</button>}</div>
}
