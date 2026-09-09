import * as React from 'react'
import type { DeviceProps } from '../_core/device'
import { journeyApi } from '../../lib/api'

function applyMask(mask: string, raw: string): string {
  const digits = raw.replace(/[^a-zA-Z0-9]/g, '')
  let out = ''
  let di = 0
  for (let i = 0; i < mask.length && di < digits.length; i++) {
    const m = mask[i]
    if (m === '9') { out += digits[di]; di++ }
    else out += m
  }
  return out
}

export const InputDevice: React.FC<DeviceProps> = ({ config, theme, value, error, onChange, blockId, campaignId }) => {
  const cfg = config || {}
  const handleChange = (raw: string) => onChange?.(cfg.mask ? applyMask(cfg.mask, raw) : raw)
  const [uniquenessError, setUniquenessError] = React.useState<string | null>(null)
  const handleBlur = () => {
    setUniquenessError(null)
    if (!cfg.checkUniqueness || cfg.type !== 'email' || !value || !campaignId) return
    journeyApi.post(`/api/campaigns/${campaignId}/journey/validate-field`, { fieldKey: cfg.blockKey || blockId, value })
      .then(res => { if (res.data && res.data.unique === false) setUniquenessError('This value is already in use') })
      .catch(() => {})
  }
  const effectiveError = error || uniquenessError
  return (
    <label className="block w-full min-w-0 max-w-full" style={{ fontFamily: theme.font, maxWidth: '100%' }}>
      {cfg.label && <span className="mb-1 block min-w-0 break-words text-xs font-medium sm:text-sm" style={{ overflowWrap: 'break-word' }}>{cfg.label}</span>}
      <input
        type={cfg.type || 'text'}
        value={value ?? ''}
        placeholder={cfg.mask || cfg.placeholder || ''}
        autoComplete={cfg.autoComplete}
        minLength={cfg.minLength}
        maxLength={cfg.mask ? cfg.mask.length : cfg.maxLength}
        min={cfg.min}
        max={cfg.max}
        pattern={cfg.pattern}
        onChange={e => handleChange(e.target.value)}
        onBlur={handleBlur}
        onClick={e => e.stopPropagation()}
        aria-invalid={Boolean(effectiveError)}
        className="w-full min-w-0 max-w-full border px-3 py-2 text-base sm:text-sm"
        style={{ borderRadius: theme.radius, fontFamily: theme.font, borderColor: effectiveError ? theme.accent : theme.primary + '40', minHeight: 44, boxSizing: 'border-box', maxWidth: '100%' }}
      />
      {uniquenessError && <span className="mt-1 block text-[11px] text-red-600">{uniquenessError}</span>}
      {cfg.helperText && !effectiveError && <span className="mt-1 block min-w-0 break-words text-[11px] opacity-70 sm:text-xs" style={{ overflowWrap: 'break-word' }}>{cfg.helperText}</span>}
    </label>
  )
}
export default InputDevice
