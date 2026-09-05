import * as React from 'react'
import type { DeviceProps } from '../_core/device'
export const CheckboxDevice: React.FC<DeviceProps> = ({ config, theme }) => {
  const cfg = config || {}
  return <label className="flex items-center gap-2 cursor-pointer" style={{ fontFamily: theme.font }}><input type="checkbox" checked={cfg.checked || false} onChange={() => {}} className="w-4 h-4" style={{ accentColor: theme.primary }} /><span className="text-sm" style={{ color: theme.foreground }}>{cfg.label || ''}</span></label>
}
export default CheckboxDevice
