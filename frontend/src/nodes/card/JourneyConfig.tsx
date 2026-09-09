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
import { BreakpointTabs } from '../_core/journeyWidgets'
import type { z } from 'zod'
type Config = z.infer<typeof cardSchema>
export const CardJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange }) => {
  const form = useForm<any>({ resolver: zodResolver(cardSchema as any), defaultValues: config })
  const v = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(form.getValues()) }, [JSON.stringify(v)])
  const actions = form.watch('actions') || []
  const images: string[] = form.watch('images') || []
  const responsive = form.watch('responsive')
  return <div className="space-y-3"><div className="space-y-1"><Label>Layout</Label><Select value={form.watch('layout')} onValueChange={val => form.setValue('layout', val as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="vertical">Vertical</SelectItem><SelectItem value="horizontal">Horizontal</SelectItem><SelectItem value="overlay">Overlay</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>Badge</Label><Input {...form.register('badge')} placeholder="New" /></div><div className="space-y-1"><Label>Title</Label><Input {...form.register('title')} placeholder="Card title" /></div><div className="space-y-1"><Label>Description</Label><Textarea {...form.register('description')} placeholder="Description" /></div>
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={Boolean(form.watch('carousel'))} onChange={e => form.setValue('carousel', e.target.checked)} /> Carousel (multiple images)</label>
    {Boolean(form.watch('carousel')) && <div className="space-y-1"><Label>Carousel images</Label>{images.map((src: string, i: number) => <div key={i} className="flex gap-1"><Input value={src} onChange={e => { const n = [...images]; n[i] = e.target.value; form.setValue('images', n as any) }} className="flex-1" /><Button type="button" variant="ghost" size="sm" onClick={() => form.setValue('images', images.filter((_, idx) => idx !== i) as any)}>✕</Button></div>)}<Button type="button" variant="outline" size="sm" onClick={() => form.setValue('images', [...images, ''] as any)}>Add image</Button></div>}
    <div className="space-y-1"><Label>Actions</Label>{actions.map((a:any,i:number)=><div key={i} className="flex gap-1"><Input value={a.label} onChange={e=>{ const n=[...actions]; n[i]={...n[i], label:e.target.value}; form.setValue('actions', n as any)} } className="flex-1" /><Button type="button" variant="ghost" size="sm" onClick={()=>{ const n=actions.filter((_:any,idx:number)=>idx!==i); form.setValue('actions', n as any)}}>✕</Button></div>)}<Button type="button" variant="outline" size="sm" onClick={()=>form.setValue('actions', [...actions, { label: 'Action', variant: 'solid' }] as any)}>Add action</Button></div>
    <BreakpointTabs
      base={form.getValues()}
      responsive={responsive}
      onChange={next => form.setValue('responsive', next as any)}
      renderFields={(value, set) => <div className="space-y-1">
        <span className="text-[11px] font-medium text-muted-foreground">Layout (override)</span>
        <Select value={value.layout || ''} onValueChange={val => set({ layout: val as any })}><SelectTrigger><SelectValue placeholder="Inherit" /></SelectTrigger><SelectContent><SelectItem value="vertical">Vertical</SelectItem><SelectItem value="horizontal">Horizontal</SelectItem><SelectItem value="overlay">Overlay</SelectItem></SelectContent></Select>
      </div>}
    />
    <Button type="button" variant="outline" size="sm" onClick={() => onChange({ layout: 'vertical' } as any)}>Reset</Button></div>
}
export default CardJourneyConfig
