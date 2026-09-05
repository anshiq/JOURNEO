import * as React from 'react'
import type { DeviceProps } from '../_core/device'

export const CheckboxDevice: React.FC<DeviceProps> = ({ config, theme, value, onChange }) => {
  const cfg = config || {}
  const inputRef = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => { if (inputRef.current) inputRef.current.indeterminate = Boolean(cfg.indeterminate) && !value }, [cfg.indeterminate, value])

  if (Array.isArray(cfg.group) && cfg.group.length > 0) {
    const selected: string[] = Array.isArray(value) ? value : []
    const toggle = (v: string) => {
      const has = selected.includes(v)
      if (has) onChange?.(selected.filter(x => x !== v))
      else {
        if (cfg.maxSelected && selected.length >= cfg.maxSelected) return
        onChange?.([...selected, v])
      }
    }
    return (
      <div className="w-full min-w-0 max-w-full" style={{ fontFamily: theme.font, maxWidth: '100%' }} onClick={e => e.stopPropagation()}>
        {cfg.label && <div className="mb-1 text-xs font-medium sm:text-sm">{cfg.label}</div>}
        {cfg.group.map((opt: any) => (
          <label key={opt.value} className="flex min-h-[44px] w-full cursor-pointer items-start gap-2 py-1">
            <input type="checkbox" checked={selected.includes(opt.value)} onChange={() => toggle(opt.value)} className="mt-0.5 h-5 w-5 shrink-0" style={{ accentColor: theme.primary }} />
            <span className="min-w-0 flex-1 break-words text-sm leading-snug" style={{ color: theme.foreground }}>{opt.label}</span>
          </label>
        ))}
      </div>
    )
  }

  return (
    <label className="flex min-h-[44px] w-full min-w-0 max-w-full cursor-pointer items-start gap-2 py-1" style={{ fontFamily: theme.font, maxWidth: '100%' }} onClick={e => e.stopPropagation()}>
      <input ref={inputRef} type="checkbox" checked={Boolean(value)} onChange={e => onChange?.(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" style={{ accentColor: theme.primary }} />
      <span className="min-w-0 flex-1 break-words text-sm leading-snug" style={{ color: theme.foreground, overflowWrap: 'break-word', wordBreak: 'break-word' }}>{cfg.label || ''}</span>
    </label>
  )
}
export default CheckboxDevice
