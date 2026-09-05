import * as React from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export function ColorFieldWithHex({ label, value, onChange, hint }: { label: string; value?: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        {value && <span className="font-mono text-[10px] text-muted-foreground">{value}</span>}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative h-8 w-10 shrink-0 overflow-hidden rounded-md border border-border/60">
          <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)} className="absolute inset-0 h-full w-full border-0 bg-transparent p-0" />
        </div>
        <Input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="#000000 or var(--...)" className="h-8 font-mono text-xs" />
        {value && <Button type="button" variant="ghost" size="icon" onClick={() => onChange('' as any)} className="h-8 w-8 text-muted-foreground" aria-label="Clear color"><X className="h-3 w-3" /></Button>}
      </div>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  )
}
export function TextField({ label, value, onChange, placeholder }: { label: string; value?: string; onChange: (v: string | undefined) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <Input value={value ?? ''} onChange={e => { const v = e.target.value; if (v === '') onChange(undefined); else onChange(v) }} placeholder={placeholder} className="h-8 text-xs" />
        <Button type="button" variant="ghost" size="icon" onClick={() => onChange(undefined)} className="h-8 w-8 text-muted-foreground" aria-label="Reset"><X className="h-3 w-3" /></Button>
      </div>
    </div>
  )
}
export function NumberField({ label, value, onChange, suffix, min, max, step = 1, placeholder }: { label: string; value?: number; onChange: (v: number | undefined) => void; suffix?: string; min?: number; max?: number; step?: number; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        <span className="font-mono text-[10px] text-muted-foreground">{value !== undefined ? `${value}${suffix || ''}` : 'auto'}</span>
      </div>
      <div className="flex items-center gap-2">
        <Input type="number" value={value ?? ''} onChange={e => { const v = e.target.value; if (v === '') onChange(undefined); else onChange(Number(v)) }} min={min} max={max} step={step} placeholder={placeholder || 'auto'} className="h-8 font-mono text-xs" />
        <Button type="button" variant="ghost" size="icon" onClick={() => onChange(undefined)} className="h-8 w-8 text-muted-foreground" aria-label="Reset to auto"><X className="h-3 w-3" /></Button>
      </div>
    </div>
  )
}
export function SelectField({ label, value, onChange, options }: { label: string; value?: string; onChange: (v: any) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <select value={value ?? ''} onChange={e => { const v = e.target.value; if (v === '') onChange(undefined); else onChange(v) }} className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <option value="">auto</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
export function SegmentedControl({ label, value, onChange, options }: { label: string; value?: string; onChange: (v: any) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <div className="grid grid-flow-col auto-cols-fr gap-1 rounded-md border bg-muted/30 p-0.5">
        {options.map(o => {
          const active = value === o.value
          return <button key={o.value} type="button" onClick={() => onChange(value === o.value ? undefined : o.value)} className={cn('rounded px-2 py-1 text-[11px] transition-colors', active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{o.label}</button>
        })}
      </div>
    </div>
  )
}
