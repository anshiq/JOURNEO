import * as React from 'react'
import type { DeviceProps } from '../_core/device'
export const SelectDevice: React.FC<DeviceProps> = ({ config, theme }) => {
  const cfg = config || {}
  return <select className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderRadius: theme.radius, fontFamily: theme.font, borderColor: theme.primary + '40' }}><option>{cfg.placeholder || 'Select...'}</option>{(cfg.options || []).map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
}
export default SelectDevice
