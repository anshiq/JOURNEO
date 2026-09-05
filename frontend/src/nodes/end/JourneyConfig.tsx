import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { endSchema } from './schema'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof endSchema>
export const EndJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange }) => {
  const form = useForm<any>({ resolver: zodResolver(endSchema as any), defaultValues: config })
  const values = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(form.getValues()) }, [JSON.stringify(values)])
  return <div className="space-y-3"><div className="space-y-1"><Label>End message</Label><Textarea {...form.register('message')} placeholder="Thank you message" /></div><Button type="button" variant="outline" size="sm" onClick={() => onChange({})}>Reset</Button></div>
}
export default EndJourneyConfig
