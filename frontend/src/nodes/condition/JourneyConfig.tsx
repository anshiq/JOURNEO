import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { conditionSchema } from './schema'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof conditionSchema>
export const ConditionJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange, errors }) => {
  const form = useForm<any>({ resolver: zodResolver(conditionSchema as any), defaultValues: config })
  const values = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { const v = form.getValues(); if(v.field && v.operator) onChange(v) }, [JSON.stringify(values)])
  return <div className="space-y-3"><div className="space-y-1"><Label>Field name</Label><Input {...form.register('field')} placeholder="age or intentScore" /></div><div className="space-y-1"><Label>Operator</Label><Select value={form.watch('operator')} onValueChange={v => form.setValue('operator', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="eq">equals</SelectItem><SelectItem value="neq">does not equal</SelectItem><SelectItem value="gt">greater than</SelectItem><SelectItem value="gte">greater than or equal</SelectItem><SelectItem value="lt">less than</SelectItem><SelectItem value="lte">less than or equal</SelectItem><SelectItem value="contains">contains</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>Compared value</Label><Input {...form.register('value')} placeholder="value" onChange={e => form.setValue('value', isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))} /></div>{errors && <div className="text-xs text-destructive">{errors.join(', ')}</div>}<Button type="button" variant="outline" size="sm" onClick={() => onChange({ field: '', operator: 'eq' } as any)}>Reset</Button></div>
}
export default ConditionJourneyConfig
