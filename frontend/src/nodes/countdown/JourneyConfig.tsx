import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { countdownSchema } from './schema'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof countdownSchema>
export const CountdownJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange }) => {
  const form = useForm<any>({ resolver: zodResolver(countdownSchema as any), defaultValues: config })
  const v = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(form.getValues()) }, [JSON.stringify(v)])
  return <div className="space-y-3"><div className="space-y-1"><Label>End time (ISO)</Label><Input type="datetime-local" value={form.watch('endTime') ? new Date(form.watch('endTime')).toISOString().slice(0,16) : ''} onChange={e => form.setValue('endTime', e.target.value ? new Date(e.target.value).toISOString() : '')} /></div><div className="space-y-1"><Label>Label</Label><Input {...form.register('label')} placeholder="Offer ends in" /></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.watch('showLabel') ?? true} onChange={e => form.setValue('showLabel', e.target.checked)} /> Show label</label><div className="space-y-1"><Label>Size</Label><Select value={form.watch('size')} onValueChange={val => form.setValue('size', val as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sm">Small</SelectItem><SelectItem value="md">Medium</SelectItem><SelectItem value="lg">Large</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>Expired message</Label><Input {...form.register('expiredMessage')} placeholder="Expired!" /></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.watch('showExpiredMessage') ?? true} onChange={e => form.setValue('showExpiredMessage', e.target.checked)} /> Show expired message</label><Button type="button" variant="outline" size="sm" onClick={() => onChange({ size: 'md' } as any)}>Reset</Button></div>
}
export default CountdownJourneyConfig
