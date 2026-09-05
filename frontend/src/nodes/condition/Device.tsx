import * as React from 'react'
import type { DeviceProps } from '../_core/device'
export const ConditionDevice: React.FC<DeviceProps> = ({ config, theme, studio, onAdvance }) => {
  const cfg = config || {}
  if (!studio) return null
  const continueBtnStyle: React.CSSProperties = { backgroundColor: theme.primary, borderRadius: theme.radius, color: 'white' }
  return <div className="py-6 text-center">
    <div className="mb-3 text-xs text-slate-500">Simulate which branch this viewer falls into:</div>
    <div className="flex flex-col gap-2">
      <button onClick={(e) => { e.stopPropagation(); onAdvance('true') }} className="rounded-lg py-2 text-xs text-white" style={continueBtnStyle}>Matches: {String(cfg.value)}</button>
      <button onClick={(e) => { e.stopPropagation(); onAdvance('false') }} className="rounded-lg border py-2 text-xs text-slate-500" style={{ borderRadius: theme.radius }}>Doesn&apos;t match (default)</button>
    </div>
  </div>
}
export default ConditionDevice
