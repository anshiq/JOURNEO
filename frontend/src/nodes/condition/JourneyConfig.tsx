import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { conditionSchema } from './schema'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof conditionSchema>
const OPERATOR_OPTIONS = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'does not equal' },
  { value: 'gt', label: 'greater than' },
  { value: 'gte', label: 'greater than or equal' },
  { value: 'lt', label: 'less than' },
  { value: 'lte', label: 'less than or equal' },
  { value: 'contains', label: 'contains' },
]
const DEVICE_OPTIONS = [
  { value: 'mobile', label: 'Mobile' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'desktop', label: 'Desktop' },
]
export const ConditionJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange, errors }) => {
  const form = useForm<any>({ resolver: zodResolver(conditionSchema as any), defaultValues: config })
  const values = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { const v = form.getValues(); if(v.field && v.operator) onChange(v) }, [JSON.stringify(values)])
  const field = form.watch('field')
  const isDevice = field === 'device'
  const branches: any[] = form.watch('branches') || []
  const multiBranch = branches.length > 0
  const setBranches = (next: any[]) => form.setValue('branches', next as any)
  return <div className="space-y-3">
    <div className="space-y-1"><Label>Field name</Label>
      <Select value={isDevice ? 'device' : '__custom'} onValueChange={v => form.setValue('field', v === 'device' ? 'device' : '')}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="__custom">Custom field</SelectItem><SelectItem value="device">Device (mobile / tablet / desktop)</SelectItem></SelectContent>
      </Select>
      {!isDevice && <Input {...form.register('field')} placeholder="age or intentScore" className="mt-1" />}
    </div>
    {!multiBranch && <>
      <div className="space-y-1"><Label>Operator</Label><Select value={form.watch('operator')} onValueChange={v => form.setValue('operator', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OPERATOR_OPTIONS.filter(o => !isDevice || o.value === 'eq' || o.value === 'neq').map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><Label>Compared value</Label>
        {isDevice
          ? <Select value={form.watch('value')} onValueChange={v => form.setValue('value', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DEVICE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
          : <Input {...form.register('value')} placeholder="value" onChange={e => form.setValue('value', isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))} />}
      </div>
    </>}
    <div className="space-y-1">
      <Label>Multi-branch</Label>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={multiBranch} onChange={e => setBranches(e.target.checked ? [{ handle: 'branch-1', operator: 'eq', value: '' }] : [])} /> Enable multiple branches</label>
      </div>
      {multiBranch && <div className="space-y-2 mt-2">
        {branches.map((b, i) => <div key={i} className="flex gap-1 items-center">
          <Input value={b.handle} onChange={e => { const n = [...branches]; n[i] = { ...n[i], handle: e.target.value }; setBranches(n) }} placeholder="handle" className="w-24" />
          <Select value={b.operator || 'eq'} onValueChange={v => { const n = [...branches]; n[i] = { ...n[i], operator: v }; setBranches(n) }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OPERATOR_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
          <Input value={b.value ?? ''} onChange={e => { const n = [...branches]; n[i] = { ...n[i], value: e.target.value }; setBranches(n) }} placeholder="value" className="flex-1" />
          <Button type="button" variant="ghost" size="sm" onClick={() => setBranches(branches.filter((_, idx) => idx !== i))}>✕</Button>
        </div>)}
        <Button type="button" variant="outline" size="sm" onClick={() => setBranches([...branches, { handle: `branch-${branches.length + 1}`, operator: 'eq', value: '' }])}>Add branch</Button>
        <div className="space-y-1"><Label>Else handle (fallback)</Label><Input {...form.register('elseHandle')} placeholder="else" /></div>
      </div>}
    </div>
    {errors && <div className="text-xs text-destructive">{errors.join(', ')}</div>}
    <Button type="button" variant="outline" size="sm" onClick={() => onChange({ field: '', operator: 'eq' } as any)}>Reset</Button>
  </div>
}
export default ConditionJourneyConfig
