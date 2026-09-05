import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { triggerSchema } from './schema'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof triggerSchema>
export const TriggerJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange, errors }) => {
  const form = useForm<any>({ resolver: zodResolver(triggerSchema as any), defaultValues: config })
  const values = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(values) }, [JSON.stringify(values)])
  return <div className="space-y-3"><div className="flex items-center gap-2"><input type="checkbox" {...form.register('entryPoint')} className="h-4 w-4 rounded border-input" /><Label>Is entry point</Label></div><p className="text-[11px] text-muted-foreground">Every journey must have exactly one entry point.</p>{errors && <div className="text-xs text-destructive">{errors.join(', ')}</div>}<Button type="button" variant="outline" size="sm" onClick={() => onChange({ entryPoint: true } as any)}>Reset to defaults</Button></div>
}
export default TriggerJourneyConfig
