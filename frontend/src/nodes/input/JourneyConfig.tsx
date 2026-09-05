import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { inputSchema } from './schema'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof inputSchema>
export const InputJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange }) => {
  const form = useForm<any>({ resolver: zodResolver(inputSchema as any), defaultValues: config })
  const v = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(form.getValues()) }, [JSON.stringify(v)])
  return <div className="space-y-3"><div className="space-y-1"><Label>Input type</Label><Select value={form.watch('type')} onValueChange={val => form.setValue('type', val as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">Text</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="password">Password</SelectItem><SelectItem value="number">Number</SelectItem><SelectItem value="tel">Tel</SelectItem><SelectItem value="url">URL</SelectItem><SelectItem value="search">Search</SelectItem><SelectItem value="date">Date</SelectItem><SelectItem value="color">Color</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>Label</Label><Input {...form.register('label')} placeholder="Field label" /></div><div className="space-y-1"><Label>Placeholder</Label><Input {...form.register('placeholder')} placeholder="Enter value..." /></div><div className="space-y-1"><Label>Helper text</Label><Input {...form.register('helperText')} placeholder="Help text" /></div><Button type="button" variant="outline" size="sm" onClick={() => onChange({ type: 'text', placeholder: '' } as any)}>Reset</Button></div>
}
export default InputJourneyConfig
