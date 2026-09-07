import * as React from 'react'
import type { DeviceProps } from '../_core/device'
export const AskAiDevice: React.FC<DeviceProps> = ({ config, theme }) => {
  const cfg = config || {}
  return (
    <div className="w-full  border px-3 py-2 text-sm opacity-70" style={{ borderRadius: theme.radius, fontFamily: theme.font }}>
      <div className="flex items-center gap-2">
        <span className="text-base">💬</span>
        <span className="flex-1 opacity-70">{cfg.placeholder || 'Ask anything...'}</span>
        <span className="rounded px-2 py-0.5 text-xs text-white" style={{ backgroundColor: theme.primary }}>{cfg.buttonLabel || 'Ask'}</span>
      </div>
      <div className="mt-1 text-[10px] opacity-60">Floating overlay · answers inline, jumps on journey match</div>
    </div>
  )
}
export default AskAiDevice
