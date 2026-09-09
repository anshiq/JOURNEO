import * as React from 'react'
import type { DeviceProps } from '../_core/device'
export const AskAiDevice: React.FC<DeviceProps> = ({ config, theme }) => {
  const cfg = config || {}
  return (
    <div className="w-full min-w-0 max-w-full break-words border px-3 py-2 text-sm opacity-70" style={{ borderRadius: theme.radius, fontFamily: theme.font, maxWidth: '100%', boxSizing: 'border-box' }}>
      <div className="flex min-w-0 max-w-full items-center gap-2">
        <span className="shrink-0 text-base" aria-hidden>💬</span>
        <span className="min-w-0 flex-1 truncate opacity-70">{cfg.placeholder || 'Ask anything...'}</span>
        <span className="max-w-full shrink-0 truncate rounded px-2 py-0.5 text-xs text-white" style={{ backgroundColor: theme.primary }}>{cfg.buttonLabel || 'Ask'}</span>
      </div>
      <div className="mt-1 min-w-0 break-words text-[10px] opacity-60">Floating overlay · answers inline, jumps on journey match</div>
    </div>
  )
}
export default AskAiDevice
