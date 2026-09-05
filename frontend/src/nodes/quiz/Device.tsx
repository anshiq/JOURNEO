import * as React from 'react'
import type { DeviceProps } from '../_core/device'
export const QuizDevice: React.FC<DeviceProps> = ({ config, theme, style, onAdvance }) => {
  const cfg = config || {}
  return <div className="p-4">
    <p className="font-medium text-slate-800 mb-4" style={{ fontFamily: theme.font, fontSize: (style as any).fontSize || '16px' }}>{cfg.question}</p>
    <div className="flex flex-col gap-2 mb-4">{(cfg.options || []).map((option: any) => <button key={option.id} onClick={(e) => { e.stopPropagation(); onAdvance('answered') }} className="text-left px-4 py-3 rounded-lg border text-sm transition hover:border-indigo-400 hover:bg-indigo-50" style={{ borderRadius: theme.radius, fontFamily: theme.font, borderColor: theme.primary + '40', backgroundColor: 'white' }}>{option.label}</button>)}</div>
    {cfg.allowSkip && <button onClick={(e) => { e.stopPropagation(); onAdvance('skipped') }} className="text-xs text-slate-400 w-full">{cfg.skipLabel || 'Skip question'}</button>}
  </div>
}
export default QuizDevice
