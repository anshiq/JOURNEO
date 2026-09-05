import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { textSchema } from './schema'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof textSchema>
export const TextJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange }) => {
  const form = useForm<any>({ resolver: zodResolver(textSchema as any), defaultValues: config })
  const v = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(form.getValues()) }, [JSON.stringify(v)])
  return <div className="space-y-3"><div className="space-y-1"><Label>Text content</Label><Textarea {...form.register('content')} placeholder="Enter text" className="min-h-[100px]" /></div><div className="space-y-1"><Label>Raw HTML (optional)</Label><Textarea {...form.register('html')} placeholder="<p>html</p>" /></div><Button type="button" variant="outline" size="sm" onClick={() => onChange({ content: '' })}>Reset</Button></div>
}
export default TextJourneyConfig
