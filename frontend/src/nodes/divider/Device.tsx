import * as React from 'react'
import type { DeviceProps } from '../_core/device'
export const DividerDevice: React.FC<DeviceProps> = ({ config, theme }) => {
  const cfg = config || {}
  return <hr className="my-4" style={{ borderColor: theme.primary + '30', borderStyle: cfg.orientation === 'vertical' ? 'solid' : 'solid' }} />
}
export default DividerDevice
