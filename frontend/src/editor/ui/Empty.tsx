import type { ReactNode } from 'react'

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center">
      <p className="font-medium text-slate-800">{title}</p>
      {children ? <div className="max-w-sm text-sm text-slate-600">{children}</div> : null}
      {action}
    </div>
  )
}
