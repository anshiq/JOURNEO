import type { ComponentPropsWithRef } from 'react'
import { cn } from '../cn'

export type TextAreaProps = Omit<ComponentPropsWithRef<'textarea'>, 'maxLength'> & {
  maxLength: number
  showCount?: boolean
}

export function TextArea({ maxLength, showCount, className, ...props }: TextAreaProps) {
  const length = String(props.value ?? '').length
  return (
    <div className="relative">
      <textarea
        {...props}
        maxLength={maxLength}
        className={cn(
          'min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
          className,
        )}
      />
      {showCount ? (
        <span className="pointer-events-none absolute right-2 bottom-2 text-xs text-slate-500">
          {length}/{maxLength}
        </span>
      ) : null}
    </div>
  )
}
