import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { formSchema } from './schema'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof formSchema>
export const FormJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange }) => {
  const form = useForm<any>({ resolver: zodResolver(formSchema as any), defaultValues: config })
  const v = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(form.getValues()) }, [JSON.stringify(v)])
  const fields = form.watch('fields') || []
  return <div className="space-y-3"><div className="space-y-1"><Label>Fields</Label>{fields.map((f:any,i:number)=><div key={f.id} className="rounded border p-2 space-y-1"><div className="flex gap-1"><Input value={f.label} onChange={e=>{ const n=[...fields]; n[i]={...n[i], label:e.target.value}; form.setValue('fields', n as any)}} placeholder="Label" className="flex-1" /><Select value={f.type} onValueChange={val=>{ const n=[...fields]; n[i]={...n[i], type: val as any}; form.setValue('fields', n as any)}}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="input">Input</SelectItem><SelectItem value="textarea">Textarea</SelectItem><SelectItem value="select">Select</SelectItem><SelectItem value="checkbox">Checkbox</SelectItem></SelectContent></Select><Button type="button" variant="ghost" size="sm" onClick={()=>{ const n=fields.filter((_:any,idx:number)=>idx!==i); form.setValue('fields', n as any)}}>✕</Button></div><Input value={f.placeholder || ''} onChange={e=>{ const n=[...fields]; n[i]={...n[i], placeholder:e.target.value}; form.setValue('fields', n as any)}} placeholder="Placeholder" /></div>)}<Button type="button" variant="outline" size="sm" onClick={()=>form.setValue('fields', [...fields, { id: `f${Date.now()}`, type: 'input', label: 'New field' }] as any)}>Add field</Button></div><div className="space-y-1"><Label>Submit label</Label><Input {...form.register('submitLabel')} /></div><Button type="button" variant="outline" size="sm" onClick={() => onChange({ fields: [] } as any)}>Reset</Button></div>
}
export default FormJourneyConfig
