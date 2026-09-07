import * as React from 'react'
import type { DeviceProps } from '../_core/device'
export const InputDevice: React.FC<DeviceProps> = ({ config, theme }) => {
  const cfg = config || {}
  return <input type={cfg.type || 'text'} placeholder={cfg.placeholder || ''} className="w-full border  px-3 py-2 text-sm" style={{ borderRadius: theme.radius, fontFamily: theme.font, borderColor: theme.primary + '40' }} onClick={(e) => e.stopPropagation()} />
}
export default InputDevice
