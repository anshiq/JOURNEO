import * as React from 'react'
import type { DeviceProps } from '../_core/device'

export const InputDevice: React.FC<DeviceProps> = ({ config, theme, value, error, onChange }) => {
  const cfg = config || {}
  return (
    <label className="block w-full min-w-0 max-w-full" style={{ fontFamily: theme.font, maxWidth: '100%' }}>
      {cfg.label && <span className="mb-1 block min-w-0 break-words text-xs font-medium sm:text-sm" style={{ overflowWrap: 'break-word' }}>{cfg.label}</span>}
      <input
        type={cfg.type || 'text'}
        value={value ?? ''}
        placeholder={cfg.placeholder || ''}
        autoComplete={cfg.autoComplete}
        minLength={cfg.minLength}
        maxLength={cfg.maxLength}
        min={cfg.min}
        max={cfg.max}
        pattern={cfg.pattern}
        onChange={e => onChange?.(e.target.value)}
        onClick={e => e.stopPropagation()}
        aria-invalid={Boolean(error)}
        className="w-full min-w-0 max-w-full border px-3 py-2 text-base sm:text-sm"
        style={{ borderRadius: theme.radius, fontFamily: theme.font, borderColor: error ? theme.accent : theme.primary + '40', minHeight: 44, boxSizing: 'border-box', maxWidth: '100%' }}
      />
      {cfg.helperText && !error && <span className="mt-1 block min-w-0 break-words text-[11px] opacity-70 sm:text-xs" style={{ overflowWrap: 'break-word' }}>{cfg.helperText}</span>}
    </label>
  )
}
export default InputDevice
