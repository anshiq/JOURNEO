import * as React from 'react'
import type { DeviceProps } from '../_core/device'
export const BadgeDevice: React.FC<DeviceProps> = ({ config, theme }) => {
  const cfg = config || {}
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>{cfg.label || 'Badge'}</span>
}
export default BadgeDevice
