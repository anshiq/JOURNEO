import * as React from 'react'
import type { DeviceProps } from '../_core/device'

export const CheckboxDevice: React.FC<DeviceProps> = ({ config, theme, value, onChange }) => {
  const cfg = config || {}
  return (
    <label className="flex cursor-pointer items-center gap-2" style={{ fontFamily: theme.font }} onClick={e => e.stopPropagation()}>
      <input type="checkbox" checked={Boolean(value)} onChange={e => onChange?.(e.target.checked)} className="h-4 w-4" style={{ accentColor: theme.primary }} />
      <span className="text-sm" style={{ color: theme.foreground }}>{cfg.label || ''}</span>
    </label>
  )
}
