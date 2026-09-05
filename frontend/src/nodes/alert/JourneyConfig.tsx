import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { alertSchema } from './schema'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { BreakpointTabs } from '../_core/journeyWidgets'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof alertSchema>
export const AlertJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange }) => {
  const form = useForm<any>({ resolver: zodResolver(alertSchema as any), defaultValues: config })
  const v = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(form.getValues()) }, [JSON.stringify(v)])
  const responsive = form.watch('responsive')
  return <div className="space-y-3"><div className="space-y-1"><Label>Variant</Label><Select value={form.watch('variant')} onValueChange={val => form.setValue('variant', val as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="info">Info</SelectItem><SelectItem value="success">Success</SelectItem><SelectItem value="warning">Warning</SelectItem><SelectItem value="error">Error</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>Title</Label><Input {...form.register('title')} placeholder="Title" /></div><div className="space-y-1"><Label>Message</Label><Textarea {...form.register('message')} placeholder="Alert message" /></div>
    <div className="space-y-1"><Label>Auto-dismiss after (ms, blank = never)</Label><Input type="number" value={form.watch('autoDismissMs') ?? ''} onChange={e => form.setValue('autoDismissMs', e.target.value === '' ? undefined : Number(e.target.value))} /></div>
    <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label>Action label</Label><Input value={form.watch('action')?.label || ''} onChange={e => form.setValue('action', { ...(form.watch('action') || {}), label: e.target.value } as any)} /></div><div className="space-y-1"><Label>Action handle</Label><Input value={form.watch('action')?.handle || ''} onChange={e => form.setValue('action', { ...(form.watch('action') || {}), handle: e.target.value } as any)} placeholder="default" /></div></div>
    <BreakpointTabs
      base={form.getValues()}
      responsive={responsive}
      onChange={next => form.setValue('responsive', next as any)}
      renderFields={(value, set) => <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={Boolean(value.compact)} onChange={e => set({ compact: e.target.checked })} /> Compact mode</label>}
    />
    <Button type="button" variant="outline" size="sm" onClick={() => onChange({ variant: 'info', message: '' } as any)}>Reset</Button></div>
}
export default AlertJourneyConfig
