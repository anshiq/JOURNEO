import { cn } from '@shared/ui/cn'
import type { ComponentPropsWithRef } from 'react'

export function Select({
  options,
  className,
  ...props
}: Omit<ComponentPropsWithRef<'select'>, 'children'> & {
  options: { value: string; label: string; disabled?: boolean }[]
}) {
  return (
    <select
      {...props}
      className={cn(
        'h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
        className,
      )}
    >
      {options.map(option => (
        <option key={option.value} value={option.value} disabled={option.disabled ?? false}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
