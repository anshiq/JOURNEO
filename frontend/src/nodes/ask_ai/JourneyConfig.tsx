import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { askAiSchema } from './schema'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof askAiSchema>
export const AskAiJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange }) => {
  const form = useForm<any>({ resolver: zodResolver(askAiSchema as any), defaultValues: config })
  const v = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(form.getValues()) }, [JSON.stringify(v)])
  return (
    <div className="space-y-3">
      <div className="space-y-1"><Label>Placeholder</Label><Input {...form.register('placeholder')} placeholder="Ask anything..." /></div>
      <div className="space-y-1"><Label>Button label</Label><Input {...form.register('buttonLabel')} placeholder="Ask" /></div>
      <div className="space-y-1"><Label>Out-of-context message</Label><Textarea {...form.register('refusalMessage')} placeholder="This question is out of context." /></div>
      <div className="space-y-1"><Label>Knowledge chunks (top-K)</Label><Input type="number" {...form.register('ragK', { valueAsNumber: true })} min={1} max={12} /></div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" {...form.register('allowJourneyJump')} /> Journey jump</label>
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" {...form.register('allowRag')} /> Knowledge answers</label>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange({ placeholder: 'Ask anything...', buttonLabel: 'Ask', refusalMessage: 'This question is out of context.', ragK: 8, allowJourneyJump: true, allowRag: true } as any)}>Reset</Button>
    </div>
  )
}
export default AskAiJourneyConfig
