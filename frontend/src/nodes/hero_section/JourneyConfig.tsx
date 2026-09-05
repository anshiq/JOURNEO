import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { heroSectionSchema } from './schema'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { FileUploader } from '@/components/ui/FileUploader'
import { BreakpointTabs } from '../_core/journeyWidgets'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof heroSectionSchema>
export const HeroSectionJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange }) => {
  const form = useForm<any>({ resolver: zodResolver(heroSectionSchema as any), defaultValues: config })
  const v = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(form.getValues()) }, [JSON.stringify(v)])
  const ctas = form.watch('ctas') || []
  const responsive = form.watch('responsive')
  return <div className="space-y-3"><div className="space-y-1"><Label>Badge</Label><Input {...form.register('badge')} placeholder="New" /></div><div className="space-y-1"><Label>Headline</Label><Input {...form.register('headline')} placeholder="Hero headline" /></div><div className="space-y-1"><Label>Subheadline</Label><Textarea {...form.register('subheadline')} placeholder="Subheadline" /></div><div className="space-y-1"><Label>Image position</Label><Select value={form.watch('imagePosition')} onValueChange={val => form.setValue('imagePosition', val as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="right">Right</SelectItem><SelectItem value="background">Background</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>CTAs</Label>{ctas.map((cta:any,i:number)=><div key={i} className="flex gap-1"><Input value={cta.label} onChange={e=>{ const n=[...ctas]; n[i]={...n[i], label:e.target.value}; form.setValue('ctas', n as any)}} placeholder="Label" className="flex-1" /><Select value={cta.variant} onValueChange={val=>{ const n=[...ctas]; n[i]={...n[i], variant: val as any}; form.setValue('ctas', n as any)}}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="solid">Solid</SelectItem><SelectItem value="outline">Outline</SelectItem></SelectContent></Select><Button type="button" variant="ghost" size="sm" onClick={()=>{ const n=ctas.filter((_:any, idx:number)=>idx!==i); form.setValue('ctas', n as any)}}>✕</Button></div>)}<Button type="button" variant="outline" size="sm" onClick={()=>form.setValue('ctas', [...ctas, { label: 'Click', variant: 'solid' }] as any)}>Add CTA</Button></div>
    <BreakpointTabs
      base={form.getValues()}
      responsive={responsive}
      onChange={next => form.setValue('responsive', next as any)}
      renderFields={(value, set) => <div className="space-y-2">
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground">Image (override)</span>
          <FileUploader value={value.image || ''} onChange={image => set({ image })} kind="image" maxSizeMB={25} />
        </div>
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground">Image position (override)</span>
          <Select value={value.imagePosition || ''} onValueChange={val => set({ imagePosition: val as any })}><SelectTrigger><SelectValue placeholder="Inherit" /></SelectTrigger><SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="right">Right</SelectItem><SelectItem value="background">Background</SelectItem></SelectContent></Select>
        </div>
      </div>}
    />
    <Button type="button" variant="outline" size="sm" onClick={() => onChange({ headline: '', ctas: [] } as any)}>Reset</Button></div>
}
export default HeroSectionJourneyConfig
