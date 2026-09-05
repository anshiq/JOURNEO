import * as React from 'react'
import type { DeviceProps } from '../_core/device'
import { evalVisibleWhen } from '../../lib/screen'

export const FormDevice: React.FC<DeviceProps> = ({ config, theme, value, error, onChange, onAdvance }) => {
  const cfg = config || {}
  const values = value && typeof value === 'object' ? value : {}
  const setField = (id: string, next: any) => onChange?.({ ...values, [id]: next })
  const allFields = cfg.fields || []
  const visibleFields = allFields.filter((f: any) => !f.visibleWhen || evalVisibleWhen(f.visibleWhen, values, {}))
  const multiStep = Boolean(cfg.multiStep)
  const stepCount = multiStep ? Math.max(1, ...visibleFields.map((f: any) => (f.step ?? 0) + 1)) : 1
  const [currentStep, setCurrentStep] = React.useState(0)
  const stepFields = multiStep ? visibleFields.filter((f: any) => (f.step ?? 0) === currentStep) : visibleFields
  const isLastStep = currentStep >= stepCount - 1

  return (
    <div className="w-full min-w-0 max-w-full space-y-3 p-4 sm:space-y-4 sm:p-5" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
      {multiStep && stepCount > 1 && <div className="text-[11px] opacity-60">Step {currentStep + 1} of {stepCount}</div>}
      {stepFields.map((field: any) => {
        const current = values[field.id] ?? (field.type === 'checkbox' ? false : '')
        return (
          <label key={field.id} className="block w-full min-w-0 max-w-full">
            {field.label && <span className="mb-1 block min-w-0 break-words text-xs opacity-80 sm:text-sm" style={{ fontFamily: theme.font, overflowWrap: 'break-word' }}>{field.label}{field.required ? ' *' : ''}</span>}
            {field.type === 'textarea' ? <textarea value={current} onChange={e => setField(field.id, e.target.value)} rows={3} className="w-full min-w-0 max-w-full border px-3 py-2 text-base sm:text-sm" style={{ borderRadius: theme.radius, fontFamily: theme.font, boxSizing: 'border-box' }} placeholder={field.placeholder} /> : field.type === 'select' ? <select value={current} onChange={e => setField(field.id, e.target.value)} className="w-full min-w-0 max-w-full border px-3 py-2 text-base sm:text-sm" style={{ borderRadius: theme.radius, fontFamily: theme.font, minHeight: 44, boxSizing: 'border-box' }}><option value="">{field.placeholder || 'Select...'}</option>{(field.options || []).map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : field.type === 'checkbox' ? <span className="flex min-h-[44px] min-w-0 max-w-full items-start gap-2 py-1"><input type="checkbox" checked={Boolean(current)} onChange={e => setField(field.id, e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" style={{ accentColor: theme.primary }} /><span className="min-w-0 flex-1 break-words text-sm leading-snug" style={{ overflowWrap: 'break-word' }}>{field.placeholder || 'Yes'}</span></span> : <input type={field.type === 'file' ? 'file' : field.type || 'text'} value={field.type === 'file' ? undefined : current} onChange={e => setField(field.id, field.type === 'file' ? e.target.files?.[0]?.name || '' : e.target.value)} className="w-full min-w-0 max-w-full border px-3 py-2 text-base sm:text-sm" style={{ borderRadius: theme.radius, fontFamily: theme.font, minHeight: 44, boxSizing: 'border-box' }} placeholder={field.placeholder} />}
          </label>
        )
      })}
      {error && <div className="min-w-0 break-words text-[11px] text-red-600 sm:text-xs">{error}</div>}
      <div className="flex gap-2">
        {multiStep && currentStep > 0 && <button type="button" onClick={e => { e.stopPropagation(); setCurrentStep(s => s - 1) }} className="min-h-[44px] flex-1 border py-2 text-sm font-medium" style={{ borderRadius: theme.radius }}>{cfg.backLabel || 'Back'}</button>}
        {multiStep && !isLastStep && <button type="button" onClick={e => { e.stopPropagation(); setCurrentStep(s => s + 1) }} className="min-h-[44px] flex-1 py-2 text-sm font-medium text-white" style={{ backgroundColor: theme.primary, borderRadius: theme.radius }}>{cfg.nextLabel || 'Next'}</button>}
        {cfg.blockOwnsExit && isLastStep && <button onClick={e => { e.stopPropagation(); onAdvance('default', values) }} className="min-h-[48px] flex-1 min-w-0 max-w-full break-words py-2 text-sm font-medium text-white sm:text-base" style={{ backgroundColor: theme.primary, borderRadius: theme.radius }}>{cfg.submitLabel || 'Submit'}</button>}
      </div>
    </div>
  )
}
export default FormDevice
