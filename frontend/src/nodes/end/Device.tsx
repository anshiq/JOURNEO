import * as React from 'react'
import type { DeviceProps } from '../_core/device'
export const EndDevice: React.FC<DeviceProps> = ({ config, theme, studio, onAdvance }) => {
  const cfg = (config as any) || {}
  return <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center" style={{ fontFamily: theme.font, color: theme.foreground }}>
    <div className="text-4xl">🎉</div>
    <div className="text-lg font-semibold">{cfg.title || 'That\u2019s a wrap'}</div>
    <div className="text-sm opacity-70">{cfg.message || 'Thanks for exploring this experience.'}</div>
    {studio && <button onClick={() => onAdvance()} className="mt-2 rounded px-3 py-1.5 text-xs text-white" style={{ backgroundColor: theme.primary, borderRadius: theme.radius }}>Play again</button>}
  </div>
}
export default EndDevice
