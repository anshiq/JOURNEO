import * as React from 'react'
import type { DeviceProps } from '../_core/device'
export const AlertDevice: React.FC<DeviceProps> = ({ config, theme }) => {
  const cfg = config || {}
  return <div className={`p-3 rounded-lg ${(cfg as any).variant === 'error' ? 'bg-red-50 border-red-200' : (cfg as any).variant === 'success' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'} border`}><p className="text-sm" style={{ fontFamily: theme.font }}>{cfg.title ? <span className="font-semibold">{cfg.title}: </span> : null}{cfg.message || ''}</p></div>
}
export default AlertDevice
