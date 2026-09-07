import * as React from 'react'
import type { DeviceProps } from '../_core/device'
export const FormDevice: React.FC<DeviceProps> = ({ config, theme, onAdvance }) => {
  const cfg = config || {}
  return <div className="p-4 space-y-3">
    {(cfg.fields || []).map((field: any) => <div key={field.id}>{field.label && <label className="block text-xs opacity-80 mb-1" style={{ fontFamily: theme.font }}>{field.label}</label>}{field.type === 'textarea' ? <textarea rows={3} className="w-full border  px-3 py-2 text-sm" style={{ borderRadius: theme.radius, fontFamily: theme.font }} placeholder={field.placeholder} /> : field.type === 'select' ? <select className="w-full border  px-3 py-2 text-sm" style={{ borderRadius: theme.radius, fontFamily: theme.font }}><option>{field.placeholder || 'Select...'}</option>{(field.options || []).map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : field.type === 'checkbox' ? <label className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4" style={{ accentColor: theme.primary }} />{field.label}</label> : <input type={field.type || 'text'} className="w-full border  px-3 py-2 text-sm" style={{ borderRadius: theme.radius, fontFamily: theme.font }} placeholder={field.placeholder} />}</div>)}
    <button onClick={(e) => { e.stopPropagation(); onAdvance() }} className="w-full py-2  text-white text-sm font-medium" style={{ backgroundColor: theme.primary, borderRadius: theme.radius }}>{cfg.submitLabel || 'Submit'}</button>
  </div>
}
export default FormDevice
