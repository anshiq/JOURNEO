export const FIELD_MAX: Record<string, number> = {
  name: 100,
  email: 254,
  phone: 32,
  company: 120,
  text: 250,
  longtext: 2000,
  dropdown: 100,
  number: 32,
  date: 10,
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export interface FieldSpec {
  kind: string
  key: string
  label: string
  required?: boolean | undefined
  options?: string[] | null | undefined
  min?: number | null | undefined
  max?: number | null | undefined
}

export function validateField(field: FieldSpec, value: unknown): string | null {
  if (field.kind === 'consent') return field.required && value !== true ? 'Please accept to continue' : null
  const text = typeof value === 'string' ? value.trim() : value === undefined || value === null ? '' : String(value)
  if (!text) return field.required ? 'This field is required' : null
  if (text.length > (FIELD_MAX[field.kind] ?? 250)) return 'This answer is too long'
  if (field.kind === 'email' && !EMAIL.test(text)) return 'Enter a valid email address'
  if (field.kind === 'phone') {
    const digits = text.replace(/[^\d]/g, '')
    if (digits.length < 6 || digits.length > 20) return 'Enter a valid phone number'
  }
  if (field.kind === 'number') {
    const number = Number(text)
    if (!Number.isFinite(number)) return 'Enter a number'
    if (field.min !== null && field.min !== undefined && number < field.min) return `Enter ${field.min} or more`
    if (field.max !== null && field.max !== undefined && number > field.max) return `Enter ${field.max} or less`
  }
  if (field.kind === 'date' && Number.isNaN(Date.parse(text))) return 'Enter a valid date'
  if (field.kind === 'dropdown' && !(field.options ?? []).includes(text)) return 'Choose one of the options'
  return null
}
