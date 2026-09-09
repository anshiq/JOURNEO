import * as React from 'react'
import type { DeviceProps } from '../_core/device'

export const SelectDevice: React.FC<DeviceProps> = ({ config, theme, value, onChange }) => {
  const cfg = config || {}
  const multiple = Boolean(cfg.multiple)
  const searchable = Boolean(cfg.searchable)
  const [query, setQuery] = React.useState('')
  const selected = multiple ? (Array.isArray(value) ? value : []) : (value ?? '')
  const options = (cfg.options || []) as { value: string; label: string }[]
  const filtered = searchable && query ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase())) : options

  if (searchable) {
    return (
      <label className="block w-full min-w-0 max-w-full" style={{ fontFamily: theme.font, maxWidth: '100%' }}>
        {cfg.label && <span className="mb-1 block min-w-0 break-words text-xs font-medium sm:text-sm" style={{ overflowWrap: 'break-word' }}>{cfg.label}</span>}
        <input
          type="text"
          value={query}
          placeholder={cfg.placeholder || 'Search...'}
          onChange={e => setQuery(e.target.value)}
          onClick={e => e.stopPropagation()}
          className="w-full min-w-0 max-w-full border px-3 py-2 text-base sm:text-sm"
          style={{ borderRadius: theme.radius, fontFamily: theme.font, borderColor: theme.primary + '40', minHeight: 44, boxSizing: 'border-box', maxWidth: '100%' }}
        />
        <div className="mt-1 max-h-40 w-full overflow-y-auto border" style={{ borderRadius: theme.radius, borderColor: theme.primary + '40' }}>
          {filtered.map(opt => {
            const isSelected = multiple ? selected.includes(opt.value) : selected === opt.value
            return (
              <div
                key={opt.value}
                onClick={e => {
                  e.stopPropagation()
                  if (multiple) onChange?.(isSelected ? selected.filter((v: string) => v !== opt.value) : [...selected, opt.value])
                  else onChange?.(opt.value)
                }}
                className="cursor-pointer px-3 py-2 text-sm"
                style={{ backgroundColor: isSelected ? theme.primary + '20' : undefined }}
              >
                {opt.label}
              </div>
            )
          })}
          {filtered.length === 0 && <div className="px-3 py-2 text-xs opacity-60">No matches</div>}
        </div>
      </label>
    )
  }

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
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </label>
  )
}
export default SelectDevice
