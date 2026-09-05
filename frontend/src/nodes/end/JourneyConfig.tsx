import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { endSchema } from './schema'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import { BreakpointTabs } from '../_core/journeyWidgets'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof endSchema>
export const EndJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange }) => {
  const form = useForm<any>({ resolver: zodResolver(endSchema as any), defaultValues: config })
  const values = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(form.getValues()) }, [JSON.stringify(values)])
  const responsive = form.watch('responsive')
  return <div className="space-y-3"><div className="space-y-1"><Label>End message</Label><Textarea {...form.register('message')} placeholder="Thank you message" /></div>
    <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label>Redirect URL</Label><Input {...form.register('redirectUrl')} placeholder="https://..." /></div><div className="space-y-1"><Label>Redirect delay (ms)</Label><Input type="number" {...form.register('redirectDelayMs', { valueAsNumber: true })} /></div></div>
    <BreakpointTabs
      base={form.getValues()}
      responsive={responsive}
      onChange={next => form.setValue('responsive', next as any)}
      renderFields={(value, set) => <div className="space-y-1"><span className="text-[11px] font-medium text-muted-foreground">Redirect URL (override)</span><Input value={value.redirectUrl || ''} onChange={e => set({ redirectUrl: e.target.value })} placeholder="https://..." /></div>}
    />
    <Button type="button" variant="outline" size="sm" onClick={() => onChange({})}>Reset</Button></div>
}
export default EndJourneyConfig
