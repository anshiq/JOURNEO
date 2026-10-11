import { useId } from 'react'
import { cn } from '../classnames'
import { useRuntime } from '../render/runtime'
import * as s from '../styles/elements.css'
import { FIELD_MAX } from './fields'
import type { ElementOf, ElementProps } from './types'

const AUTOCOMPLETE: Record<string, string> = {
  name: 'given-name',
  email: 'email',
  phone: 'tel',
  company: 'organization',
}
const INPUT_TYPE: Record<string, string> = { email: 'email', phone: 'tel', number: 'number', date: 'date' }

export function Form({ element, style }: ElementProps<ElementOf<'form'>>) {
  const runtime = useRuntime()
  const formId = useId()
  const fields = element.props.fields ?? []
  const fieldValue = (key: string) => {
    const value = runtime.answers[key]
    if (value !== undefined) return value
    return element.props.prefill ? runtime.vars[key] : undefined
  }
  const inputStyle = style.variant === 'soft' ? s.inputFilled : undefined
  return (
    <form
      noValidate
      className={s.formGrid}
      onSubmit={event => {
        event.preventDefault()
        runtime.submitForm(element.id)
      }}
    >
      {fields.map(field => {
        const id = `${formId}-${field.id}`
        const error = runtime.errors[field.key]
        const describedBy = error ? `${id}-error` : undefined
        const value = fieldValue(field.key)
        const onText = (text: string) => {
          runtime.clearError(field.key)
          runtime.setAnswer(field.key, text)
        }
        if (field.kind === 'consent') {
          return (
            <div key={field.id} className={cn(s.field, s.fieldFull)}>
              <label className={s.consent} htmlFor={id}>
                <input
                  id={id}
                  type="checkbox"
                  className={s.checkbox}
                  checked={value === true}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={describedBy}
                  onChange={event => {
                    runtime.clearError(field.key)
                    runtime.setAnswer(field.key, event.target.checked)
                  }}
                />
                <span>{field.consentText || field.label}</span>
              </label>
              {error ? (
                <p id={describedBy} className={s.error} role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          )
        }
        const common = {
          id,
          name: field.key,
          className: cn(field.kind === 'longtext' ? s.textarea : s.input, inputStyle),
          'aria-invalid': error ? true : undefined,
          'aria-describedby': describedBy,
          'aria-required': field.required ? true : undefined,
        }
        return (
          <div key={field.id} className={cn(s.field, !field.half && s.fieldFull)}>
            <label className={s.label} htmlFor={id}>
              {field.label}
              {field.required ? <span aria-hidden="true"> *</span> : null}
            </label>
            {field.kind === 'longtext' ? (
              <textarea
                {...common}
                maxLength={FIELD_MAX.longtext}
                placeholder={field.placeholder ?? undefined}
                value={typeof value === 'string' ? value : ''}
                onChange={event => onText(event.target.value)}
              />
            ) : field.kind === 'dropdown' ? (
              <select
                {...common}
                value={typeof value === 'string' ? value : ''}
                onChange={event => onText(event.target.value)}
              >
                <option value="">{field.placeholder || 'Choose…'}</option>
                {(field.options ?? []).map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                {...common}
                type={INPUT_TYPE[field.kind] ?? 'text'}
                inputMode={field.kind === 'phone' ? 'tel' : field.kind === 'email' ? 'email' : undefined}
                autoComplete={AUTOCOMPLETE[field.kind] ?? 'off'}
                maxLength={FIELD_MAX[field.kind] ?? 250}
                min={field.min ?? undefined}
                max={field.max ?? undefined}
                placeholder={field.placeholder ?? undefined}
                value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
                onChange={event => onText(event.target.value)}
              />
            )}
            {error ? (
              <p id={describedBy} className={s.error} role="alert">
                {error}
              </p>
            ) : null}
          </div>
        )
      })}
      <div className={s.honeypot} aria-hidden="true">
        <label htmlFor={`${formId}-website`}>Website</label>
        <input
          id={`${formId}-website`}
          tabIndex={-1}
          autoComplete="off"
          maxLength={200}
          value={typeof runtime.answers.__hp === 'string' ? runtime.answers.__hp : ''}
          onChange={event => runtime.setAnswer('__hp', event.target.value)}
        />
      </div>
      <div className={s.fieldFull} data-jx-primary="">
        <button
          type="submit"
          data-jx-tap=""
          disabled={runtime.busy}
          className={cn(s.button.primary, s.buttonItem, runtime.busy && s.busy)}
          style={{ width: '100%' }}
        >
          {element.props.submitLabel ?? 'Submit'}
        </button>
      </div>
    </form>
  )
}
