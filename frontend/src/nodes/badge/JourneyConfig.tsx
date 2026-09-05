import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { badgeSchema } from './schema'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof badgeSchema>
export const BadgeJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange }) => {
  const form = useForm<any>({ resolver: zodResolver(badgeSchema as any), defaultValues: config })
  const v = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(form.getValues()) }, [JSON.stringify(v)])
  return <div className="space-y-3"><div className="space-y-1"><Label>Label</Label><Input {...form.register('label')} placeholder="Badge text" /></div><div className="space-y-1"><Label>Variant</Label><Select value={form.watch('variant')} onValueChange={val => form.setValue('variant', val as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="solid">Solid</SelectItem><SelectItem value="soft">Soft</SelectItem><SelectItem value="outline">Outline</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>Color</Label><Input {...form.register('color')} placeholder="#4f46e5" /></div><Button type="button" variant="outline" size="sm" onClick={() => onChange({ label: 'Badge', variant: 'soft' } as any)}>Reset</Button></div>
}
export default BadgeJourneyConfig
