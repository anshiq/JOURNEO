import * as React from 'react'
import type { DeviceProps } from '../_core/device'
export const AlertDevice: React.FC<DeviceProps> = ({ config, theme }) => {
  const cfg = config || {}
  const tone = (cfg as any).variant === 'error' ? theme.accent : theme.primary
  return <div className="border p-3" style={{ borderColor: tone, backgroundColor: tone + '14', color: theme.foreground, borderRadius: theme.radius, fontFamily: theme.font }}><p className="text-sm">{cfg.title ? <span className="font-semibold">{cfg.title}: </span> : null}{cfg.message || ''}</p></div>
}
export default AlertDevice
