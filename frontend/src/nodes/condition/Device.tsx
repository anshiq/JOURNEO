import * as React from 'react'
import type { DeviceProps } from '../_core/device'
export const ConditionDevice: React.FC<DeviceProps> = ({ config, theme, studio, onAdvance }) => {
  const cfg = config || {}
  if (!studio) return null
  const continueBtnStyle: React.CSSProperties = { backgroundColor: theme.primary, borderRadius: theme.radius, color: 'white' }
  return <div className="w-full min-w-0 max-w-full break-words px-2 py-6 text-center">
    <div className="mb-3 min-w-0 break-words text-xs opacity-70">Simulate which branch this viewer falls into:</div>
    <div className="flex min-w-0 max-w-full flex-col gap-2">
      <button onClick={(e) => { e.stopPropagation(); onAdvance('true') }} className="min-h-[44px] min-w-0 max-w-full break-words px-3 py-2 text-xs text-white" style={{ ...continueBtnStyle, overflowWrap: 'break-word', wordBreak: 'break-all' }}>Matches: {String(cfg.value)}</button>
      <button onClick={(e) => { e.stopPropagation(); onAdvance('false') }} className="min-h-[44px] min-w-0 max-w-full break-words border px-3 py-2 text-xs opacity-70" style={{ borderRadius: theme.radius, overflowWrap: 'break-word' }}>Doesn&apos;t match (default)</button>
    </div>
  </div>
}
export default ConditionDevice
