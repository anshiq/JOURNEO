import type { ComponentPropsWithRef } from 'react'
import { cn } from '../cn'

export type TextInputProps = Omit<ComponentPropsWithRef<'input'>, 'maxLength' | 'type'> & {
  maxLength: number
  type?: 'text' | 'email' | 'tel' | 'url' | 'search'
  showCount?: boolean
}

export function TextInput({ maxLength, showCount, className, type = 'text', ...props }: TextInputProps) {
  const length = String(props.value ?? '').length
  return (
    <div className="relative">
      <input
        {...props}
        type={type}
        maxLength={maxLength}
        className={cn(
          'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
          showCount && 'pr-14',
          className,
        )}
      />
      {showCount ? (
        <span className="pointer-events-none absolute top-2 right-2 text-xs text-slate-500">
          {length}/{maxLength}
        </span>
      ) : null}
    </div>
  )
}
