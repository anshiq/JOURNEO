import { cn } from '@shared/ui/cn'
import type { ReactNode } from 'react'

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'md',
}: {
  value: T | null | undefined
  options: { value: T; label: ReactNode; title?: string }[]
  onChange: (value: T) => void
  label: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex w-full rounded-md bg-slate-100 p-0.5">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          title={option.title}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex flex-1 items-center justify-center gap-1 rounded px-2 font-medium whitespace-nowrap text-slate-600 transition outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
            size === 'sm' ? 'h-6 text-xs' : 'h-7 text-xs',
            value === option.value && 'bg-white text-slate-900 shadow-sm',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
