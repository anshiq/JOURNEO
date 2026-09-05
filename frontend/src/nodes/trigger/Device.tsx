import * as React from 'react'
import type { DeviceProps } from '../_core/device'
export const TriggerDevice: React.FC<DeviceProps> = ({ config, theme, onAdvance }) => {
  const ctaLabel = (config as any)?.ctaLabel || theme.cta
  return <div className="text-center py-10"><div className="text-3xl mb-2">📲</div><div className="font-medium text-slate-800">Journey Started</div><div className="text-xs text-slate-500 mt-1">Entry point triggered</div><button onClick={(e) => { e?.stopPropagation(); onAdvance() }} className="mt-4 w-full text-white text-sm py-2 rounded-lg" style={{ backgroundColor: theme.primary, borderRadius: theme.radius }}>{ctaLabel}</button></div>
}
export default TriggerDevice
