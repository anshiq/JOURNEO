import * as React from 'react'
import type { DeviceProps } from '../_core/device'

export const CheckboxDevice: React.FC<DeviceProps> = ({ config, theme, value, onChange }) => {
  const cfg = config || {}
  return (
    <label className="flex min-h-[44px] w-full min-w-0 max-w-full cursor-pointer items-start gap-2 py-1" style={{ fontFamily: theme.font, maxWidth: '100%' }} onClick={e => e.stopPropagation()}>
      <input type="checkbox" checked={Boolean(value)} onChange={e => onChange?.(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" style={{ accentColor: theme.primary }} />
      <span className="min-w-0 flex-1 break-words text-sm leading-snug" style={{ color: theme.foreground, overflowWrap: 'break-word', wordBreak: 'break-word' }}>{cfg.label || ''}</span>
    </label>
  )
}
export default CheckboxDevice
