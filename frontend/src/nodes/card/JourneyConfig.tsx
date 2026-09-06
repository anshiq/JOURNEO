import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cardSchema } from './schema'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof cardSchema>
export const CardJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange }) => {
  const form = useForm<any>({ resolver: zodResolver(cardSchema as any), defaultValues: config })
  const v = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(form.getValues()) }, [JSON.stringify(v)])
  const actions = form.watch('actions') || []
  return <div className="space-y-3"><div className="space-y-1"><Label>Layout</Label><Select value={form.watch('layout')} onValueChange={val => form.setValue('layout', val as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="vertical">Vertical</SelectItem><SelectItem value="horizontal">Horizontal</SelectItem><SelectItem value="overlay">Overlay</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>Badge</Label><Input {...form.register('badge')} placeholder="New" /></div><div className="space-y-1"><Label>Title</Label><Input {...form.register('title')} placeholder="Card title" /></div><div className="space-y-1"><Label>Description</Label><Textarea {...form.register('description')} placeholder="Description" /></div><div className="space-y-1"><Label>Actions</Label>{actions.map((a:any,i:number)=><div key={i} className="flex gap-1"><Input value={a.label} onChange={e=>{ const n=[...actions]; n[i]={...n[i], label:e.target.value}; form.setValue('actions', n as any)} } className="flex-1" /><Button type="button" variant="ghost" size="sm" onClick={()=>{ const n=actions.filter((_:any,idx:number)=>idx!==i); form.setValue('actions', n as any)}}>✕</Button></div>)}<Button type="button" variant="outline" size="sm" onClick={()=>form.setValue('actions', [...actions, { label: 'Action', variant: 'solid' }] as any)}>Add action</Button></div><Button type="button" variant="outline" size="sm" onClick={() => onChange({ layout: 'vertical' } as any)}>Reset</Button></div>
}
export default CardJourneyConfig
