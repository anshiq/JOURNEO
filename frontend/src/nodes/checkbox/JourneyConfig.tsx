import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { checkboxSchema } from './schema'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof checkboxSchema>
export const CheckboxJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange }) => {
  const form = useForm<any>({ resolver: zodResolver(checkboxSchema as any), defaultValues: config })
  const v = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(form.getValues()) }, [JSON.stringify(v)])
  const group = form.watch('group') || []
  return <div className="space-y-3"><div className="space-y-1"><Label>Label</Label><Input {...form.register('label')} placeholder="I agree to terms" /></div>
    <div className="flex items-center gap-4"><label className="flex items-center gap-2 text-xs"><input type="checkbox" {...form.register('checked')} /> Checked by default</label><label className="flex items-center gap-2 text-xs"><input type="checkbox" {...form.register('indeterminate')} /> Indeterminate</label></div>
    <div className="space-y-1"><Label>Group options (checkbox group)</Label>{group.map((opt: any, i: number) => <div key={i} className="flex gap-1"><Input value={opt.value} onChange={e => { const n = [...group]; n[i] = { ...n[i], value: e.target.value }; form.setValue('group', n as any) }} placeholder="value" className="flex-1" /><Input value={opt.label} onChange={e => { const n = [...group]; n[i] = { ...n[i], label: e.target.value }; form.setValue('group', n as any) }} placeholder="label" className="flex-1" /><Button type="button" variant="ghost" size="sm" onClick={() => form.setValue('group', group.filter((_: any, idx: number) => idx !== i) as any)}>✕</Button></div>)}<Button type="button" variant="outline" size="sm" onClick={() => form.setValue('group', [...group, { value: `opt${group.length + 1}`, label: `Option ${group.length + 1}` }] as any)}>Add option</Button></div>
    {group.length > 0 && <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label>Min selected</Label><Input type="number" {...form.register('minSelected', { valueAsNumber: true })} /></div><div className="space-y-1"><Label>Max selected</Label><Input type="number" {...form.register('maxSelected', { valueAsNumber: true })} /></div></div>}
    <Button type="button" variant="outline" size="sm" onClick={() => onChange({})}>Reset</Button></div>
}
export default CheckboxJourneyConfig
