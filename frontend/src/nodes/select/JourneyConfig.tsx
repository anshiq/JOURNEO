import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { selectSchema } from './schema'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof selectSchema>
export const SelectJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange }) => {
  const form = useForm<any>({ resolver: zodResolver(selectSchema as any), defaultValues: config })
  const v = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(form.getValues()) }, [JSON.stringify(v)])
  const options = form.watch('options') || []
  return <div className="space-y-3"><div className="space-y-1"><Label>Label</Label><Input {...form.register('label')} placeholder="Select label" /></div><div className="space-y-1"><Label>Placeholder</Label><Input {...form.register('placeholder')} placeholder="Choose..." /></div><div className="space-y-1"><Label>Options</Label>{options.map((opt: any, i: number) => <div key={i} className="flex gap-1"><Input value={opt.value} onChange={e => { const next = [...options]; next[i] = { ...next[i], value: e.target.value }; form.setValue('options', next as any) }} placeholder="value" className="flex-1" /><Input value={opt.label} onChange={e => { const next = [...options]; next[i] = { ...next[i], label: e.target.value }; form.setValue('options', next as any) }} placeholder="label" className="flex-1" /><Button type="button" variant="ghost" size="sm" onClick={() => { const next = options.filter((_:any, idx:number)=> idx!==i); form.setValue('options', next as any) }}>✕</Button></div>) }<Button type="button" variant="outline" size="sm" onClick={() => form.setValue('options', [...options, { value: `opt${options.length+1}`, label: `Option ${options.length+1}` }] as any)}>Add option</Button></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" {...form.register('searchable')} /> Searchable</label><Button type="button" variant="outline" size="sm" onClick={() => onChange({ options: [] } as any)}>Reset</Button></div>
}
export default SelectJourneyConfig
