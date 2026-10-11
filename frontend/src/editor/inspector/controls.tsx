import { TextArea } from '@shared/ui/primitives/TextArea'
import { TextInput } from '@shared/ui/primitives/TextInput'
import { Field } from '../ui/Field'
import { Segmented } from '../ui/Segmented'
import { Select } from '../ui/Select'

export function TextControl({
  label,
  value,
  max,
  onChange,
  field,
  placeholder,
  hint,
  multiline,
  type,
  error,
  rows,
}: {
  label: string
  value: string | null | undefined
  max: number
  onChange: (value: string) => void
  field?: string
  placeholder?: string
  hint?: string
  multiline?: boolean
  type?: 'text' | 'email' | 'tel' | 'url'
  error?: string | null
  rows?: number
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      {id =>
        multiline ? (
          <TextArea
            id={id}
            data-field={field}
            maxLength={max}
            rows={rows ?? 3}
            value={value ?? ''}
            placeholder={placeholder}
            onChange={event => onChange(event.target.value)}
          />
        ) : (
          <TextInput
            id={id}
            data-field={field}
            type={type ?? 'text'}
            maxLength={max}
            value={value ?? ''}
            placeholder={placeholder}
            onChange={event => onChange(event.target.value)}
          />
        )
      }
    </Field>
  )
}

export function NumberControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
  field,
  hint,
  placeholder,
}: {
  label: string
  value: number | null | undefined
  min: number
  max: number
  step?: number
  onChange: (value: number | null) => void
  field?: string
  hint?: string
  placeholder?: string
}) {
  return (
    <Field label={label} hint={hint}>
      {id => (
        <input
          id={id}
          data-field={field}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={step ?? 1}
          value={value ?? ''}
          placeholder={placeholder}
          onChange={event => {
            const raw = event.target.value
            if (raw === '') {
              onChange(null)
              return
            }
            const parsed = Number(raw)
            if (Number.isFinite(parsed)) onChange(Math.max(min, Math.min(max, parsed)))
          }}
          className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
      )}
    </Field>
  )
}

export function SelectControl({
  label,
  value,
  options,
  onChange,
  field,
  hint,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  field?: string
  hint?: string
}) {
  return (
    <Field label={label} hint={hint}>
      {id => (
        <Select
          id={id}
          data-field={field}
          value={value}
          options={options}
          onChange={event => onChange(event.target.value)}
        />
      )}
    </Field>
  )
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T | null | undefined
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-700">{label}</p>
      <Segmented label={label} value={value} options={options} onChange={onChange} />
    </div>
  )
}

export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function fromLocalInput(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export function DateTimeControl({
  label,
  value,
  onChange,
  field,
  hint,
}: {
  label: string
  value: string | null | undefined
  onChange: (iso: string | null) => void
  field?: string
  hint?: string
}) {
  return (
    <Field label={label} hint={hint ?? `Shown in your time zone (${Intl.DateTimeFormat().resolvedOptions().timeZone})`}>
      {id => (
        <input
          id={id}
          data-field={field}
          type="datetime-local"
          value={toLocalInput(value)}
          onChange={event => onChange(fromLocalInput(event.target.value))}
          className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
      )}
    </Field>
  )
}
