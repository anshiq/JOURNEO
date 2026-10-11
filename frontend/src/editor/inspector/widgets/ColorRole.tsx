import { resolveColors } from '@experience/index'
import type { Theme } from '@journey/model/types'
import { cn } from '@shared/ui/cn'

export const ROLES = ['primary', 'accent', 'text', 'muted', 'surface', 'background'] as const
export type Role = (typeof ROLES)[number]
const ROLE_LABEL: Record<Role, string> = {
  primary: 'Primary',
  accent: 'Accent',
  text: 'Text',
  muted: 'Muted',
  surface: 'Surface',
  background: 'Background',
}

export function ColorRole({
  label,
  theme,
  value,
  onChange,
  allowCustom,
  allowDefault = true,
}: {
  label: string
  theme: Theme | undefined
  value: string | null | undefined
  onChange: (value: string | null) => void
  allowCustom?: boolean
  allowDefault?: boolean
}) {
  const colors = resolveColors(theme) as unknown as Record<string, string>
  const custom = value?.startsWith('#') ? value : null
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-700">{label}</p>
      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={label}>
        {allowDefault ? (
          <button
            type="button"
            role="radio"
            aria-checked={!value}
            onClick={() => onChange(null)}
            className={cn(
              'h-7 rounded-md border px-2 text-xs',
              !value ? 'border-indigo-500 ring-1 ring-indigo-300' : 'border-slate-300',
            )}
          >
            Theme
          </button>
        ) : null}
        {ROLES.map(role => (
          <button
            key={role}
            type="button"
            role="radio"
            aria-checked={value === role}
            aria-label={ROLE_LABEL[role]}
            title={ROLE_LABEL[role]}
            onClick={() => onChange(role)}
            className={cn(
              'h-7 w-7 rounded-full border',
              value === role ? 'border-indigo-600 ring-2 ring-indigo-300' : 'border-slate-300',
            )}
            style={{ background: colors[role] }}
          />
        ))}
        {allowCustom ? (
          <label
            className={cn(
              'relative flex h-7 cursor-pointer items-center gap-1 rounded-md border px-2 text-xs',
              custom ? 'border-indigo-500 ring-1 ring-indigo-300' : 'border-slate-300',
            )}
          >
            <span
              className="h-3.5 w-3.5 rounded-full border border-slate-300"
              style={{ background: custom ?? '#ffffff' }}
            />
            More
            <input
              type="color"
              aria-label={`${label} custom colour`}
              value={custom ?? '#ffffff'}
              onChange={event => onChange(event.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        ) : null}
      </div>
    </div>
  )
}
