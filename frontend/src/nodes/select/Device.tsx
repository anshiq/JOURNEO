import * as React from 'react'
import type { DeviceProps } from '../_core/device'

export const SelectDevice: React.FC<DeviceProps> = ({ config, theme, value, onChange }) => {
  const cfg = config || {}
  const multiple = Boolean(cfg.multiple)
  const selected = multiple ? (Array.isArray(value) ? value : []) : (value ?? '')
  return (
    <label className="block w-full min-w-0 max-w-full" style={{ fontFamily: theme.font, maxWidth: '100%' }}>
      {cfg.label && <span className="mb-1 block min-w-0 break-words text-xs font-medium sm:text-sm" style={{ overflowWrap: 'break-word' }}>{cfg.label}</span>}
      <select
        multiple={multiple}
        value={selected}
        onChange={e => onChange?.(multiple ? Array.from(e.target.selectedOptions, option => option.value) : e.target.value)}
        onClick={e => e.stopPropagation()}
        className="w-full min-w-0 max-w-full border px-3 py-2 text-base sm:text-sm"
        style={{ borderRadius: theme.radius, fontFamily: theme.font, borderColor: theme.primary + '40', minHeight: multiple ? 72 : 44, boxSizing: 'border-box', maxWidth: '100%' }}
      >
        {!multiple && <option value="">{cfg.placeholder || 'Select...'}</option>}
        {(cfg.options || []).map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </label>
  )
}
export default SelectDevice
