import * as React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

export function El({ title, children, enabled = true, onToggle, defaultOpen = false }: { title: string; children: React.ReactNode; enabled?: boolean; onToggle?: () => void; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen)
  return <div className="rounded-lg border bg-muted/20">
    <div className="flex items-center justify-between p-3">
      <button type="button" onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 text-left">
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      </button>
      {onToggle && <button type="button" onClick={onToggle} className={`text-[11px] px-2 py-0.5 rounded-full border ${enabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>{enabled ? 'Enabled' : 'Disabled'}</button>}
    </div>
    {open && <div className="px-3 pb-3 space-y-3">{enabled ? children : <div className="text-[11px] text-muted-foreground italic">Disabled — click Enable to add back</div>}</div>}
  </div>
}
