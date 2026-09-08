import * as React from 'react'
import type { DeviceProps } from '../_core/device'

export const FormDevice: React.FC<DeviceProps> = ({ config, theme, value, error, onChange, onAdvance }) => {
  const cfg = config || {}
  const values = value && typeof value === 'object' ? value : {}
  const setField = (id: string, next: any) => onChange?.({ ...values, [id]: next })
  return (
    <div className="space-y-3 p-4">
      {(cfg.fields || []).map((field: any) => {
        const current = values[field.id] ?? (field.type === 'checkbox' ? false : '')
        return (
          <label key={field.id} className="block">
            {field.label && <span className="mb-1 block text-xs opacity-80" style={{ fontFamily: theme.font }}>{field.label}{field.required ? ' *' : ''}</span>}
            {field.type === 'textarea' ? <textarea value={current} onChange={e => setField(field.id, e.target.value)} rows={3} className="w-full border px-3 py-2 text-sm" style={{ borderRadius: theme.radius, fontFamily: theme.font }} placeholder={field.placeholder} /> : field.type === 'select' ? <select value={current} onChange={e => setField(field.id, e.target.value)} className="w-full border px-3 py-2 text-sm" style={{ borderRadius: theme.radius, fontFamily: theme.font }}><option value="">{field.placeholder || 'Select...'}</option>{(field.options || []).map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : field.type === 'checkbox' ? <span className="flex items-center gap-2"><input type="checkbox" checked={Boolean(current)} onChange={e => setField(field.id, e.target.checked)} className="h-4 w-4" style={{ accentColor: theme.primary }} /><span className="text-sm">{field.placeholder || 'Yes'}</span></span> : <input type={field.type === 'file' ? 'file' : field.type || 'text'} value={field.type === 'file' ? undefined : current} onChange={e => setField(field.id, field.type === 'file' ? e.target.files?.[0]?.name || '' : e.target.value)} className="w-full border px-3 py-2 text-sm" style={{ borderRadius: theme.radius, fontFamily: theme.font }} placeholder={field.placeholder} />}
          </label>
        )
      })}
      {error && <div className="text-[11px] text-red-600">{error}</div>}
      {cfg.blockOwnsExit && <button onClick={e => { e.stopPropagation(); onAdvance('default', values) }} className="w-full py-2 text-sm font-medium text-white" style={{ backgroundColor: theme.primary, borderRadius: theme.radius }}>{cfg.submitLabel || 'Submit'}</button>}
    </div>
  )
}
