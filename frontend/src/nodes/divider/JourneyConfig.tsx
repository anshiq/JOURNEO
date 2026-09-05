import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { dividerSchema } from './schema'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { BreakpointTabs } from '../_core/journeyWidgets'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof dividerSchema>
export const DividerJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange }) => {
  const form = useForm<any>({ resolver: zodResolver(dividerSchema as any), defaultValues: config })
  const v = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(form.getValues()) }, [JSON.stringify(v)])
  const responsive = form.watch('responsive')
  return <div className="space-y-3"><div className="space-y-1"><Label>Orientation</Label><Select value={form.watch('orientation')} onValueChange={val => form.setValue('orientation', val as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="horizontal">Horizontal</SelectItem><SelectItem value="vertical">Vertical</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>Color</Label><Input {...form.register('color')} placeholder="#e2e8f0" /></div><div className="space-y-1"><Label>Label (e.g. "OR")</Label><Input {...form.register('label')} placeholder="OR" /></div>
    <BreakpointTabs
      base={form.getValues()}
      responsive={responsive}
      onChange={next => form.setValue('responsive', next as any)}
      renderFields={(value, set) => <div className="space-y-1"><span className="text-[11px] font-medium text-muted-foreground">Spacing (override)</span><Input value={value.spacing || ''} onChange={e => set({ spacing: e.target.value })} placeholder="16px" /></div>}
    />
    <Button type="button" variant="outline" size="sm" onClick={() => onChange({ orientation: 'horizontal' } as any)}>Reset</Button></div>
}
export default DividerJourneyConfig
