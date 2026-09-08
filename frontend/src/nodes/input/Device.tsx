import * as React from 'react'
import type { DeviceProps } from '../_core/device'

export const InputDevice: React.FC<DeviceProps> = ({ config, theme, value, error, onChange }) => {
  const cfg = config || {}
  return (
    <label className="block w-full" style={{ fontFamily: theme.font }}>
      {cfg.label && <span className="mb-1 block text-xs font-medium">{cfg.label}</span>}
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
        className="w-full border px-3 py-2 text-sm"
        style={{ borderRadius: theme.radius, fontFamily: theme.font, borderColor: error ? theme.accent : theme.primary + '40' }}
      />
      {cfg.helperText && !error && <span className="mt-1 block text-[11px] opacity-70">{cfg.helperText}</span>}
    </label>
  )
}
