import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ratingSchema } from './schema'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof ratingSchema>
export const RatingJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange }) => {
  const form = useForm<any>({ resolver: zodResolver(ratingSchema as any), defaultValues: config })
  const v = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(form.getValues()) }, [JSON.stringify(v)])
  return <div className="space-y-3"><div className="space-y-1"><Label>Label</Label><Input {...form.register('label')} placeholder="Rate us" /></div><div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label>Value</Label><Input type="number" {...form.register('value', { valueAsNumber: true })} /></div><div className="space-y-1"><Label>Max</Label><Input type="number" {...form.register('max', { valueAsNumber: true })} /></div></div>
    <div className="space-y-1"><Label>Icon</Label><Select value={form.watch('icon')} onValueChange={val => form.setValue('icon', val as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="star">Star</SelectItem><SelectItem value="heart">Heart</SelectItem><SelectItem value="thumb">Thumb</SelectItem></SelectContent></Select></div>
    <div className="flex items-center gap-4"><label className="flex items-center gap-2 text-xs"><input type="checkbox" {...form.register('allowHalf')} /> Allow half stars</label><label className="flex items-center gap-2 text-xs"><input type="checkbox" {...form.register('readOnly')} /> Read-only (display aggregate)</label></div>
    <Button type="button" variant="outline" size="sm" onClick={() => onChange({ value: 0, max: 5 } as any)}>Reset</Button></div>
}
export default RatingJourneyConfig
