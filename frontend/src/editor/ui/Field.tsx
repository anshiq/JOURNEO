import { cn } from '@shared/ui/cn'
import { type ReactNode, useId } from 'react'

export function Field({
  label,
  hint,
  error,
  children,
  aside,
  className,
}: {
  label: string
  hint?: string | undefined
  error?: string | null | undefined
  children: (id: string) => ReactNode
  aside?: ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-slate-700">
          {label}
        </label>
        {aside}
      </div>
      {children(id)}
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
      {hint && !error ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="space-y-3 border-b border-slate-200 px-4 py-4 last:border-b-0">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}
