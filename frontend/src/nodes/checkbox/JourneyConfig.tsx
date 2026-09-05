import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { checkboxSchema } from './schema'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof checkboxSchema>
export const CheckboxJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange }) => {
  const form = useForm<any>({ resolver: zodResolver(checkboxSchema as any), defaultValues: config })
  const v = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(form.getValues()) }, [JSON.stringify(v)])
  return <div className="space-y-3"><div className="space-y-1"><Label>Label</Label><Input {...form.register('label')} placeholder="I agree to terms" /></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" {...form.register('checked')} /> Checked by default</label><Button type="button" variant="outline" size="sm" onClick={() => onChange({})}>Reset</Button></div>
}
export default CheckboxJourneyConfig
