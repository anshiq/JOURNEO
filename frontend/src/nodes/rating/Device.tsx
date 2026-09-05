import * as React from 'react'
import type { DeviceProps } from '../_core/device'
export const RatingDevice: React.FC<DeviceProps> = ({ config, theme }) => {
  const cfg = config || {}
  return <div className="flex gap-1">{Array.from({ length: cfg.max || 5 }, (_, i) => <span key={i} className="text-lg" style={{ color: i < (cfg.value || 0) ? theme.accent : theme.primary + '40' }}>★</span>)}</div>
}
export default RatingDevice
