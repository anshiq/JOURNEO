import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { containerSchema } from './schema'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof containerSchema>
export const ContainerJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange }) => {
  const form = useForm<any>({ resolver: zodResolver(containerSchema as any), defaultValues: config })
  const v = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(form.getValues()) }, [JSON.stringify(v)])
  return <div className="space-y-3"><div className="space-y-1"><Label>Direction</Label><Select value={form.watch('direction')} onValueChange={v => form.setValue('direction', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="row">Row</SelectItem><SelectItem value="column">Column</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>Gap</Label><Input {...form.register('gap')} placeholder="16px" /></div><div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label>Align</Label><Select value={form.watch('align')} onValueChange={v => form.setValue('align', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="start">Start</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="end">End</SelectItem><SelectItem value="stretch">Stretch</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>Justify</Label><Select value={form.watch('justify')} onValueChange={v => form.setValue('justify', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="start">Start</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="end">End</SelectItem><SelectItem value="between">Between</SelectItem><SelectItem value="around">Around</SelectItem></SelectContent></Select></div></div><Button type="button" variant="outline" size="sm" onClick={() => onChange({ direction: 'column', gap: '16px' } as any)}>Reset</Button></div>
}
export default ContainerJourneyConfig
