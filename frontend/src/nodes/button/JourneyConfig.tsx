import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { buttonSchema } from './schema'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof buttonSchema>
export const ButtonJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange }) => {
  const form = useForm<any>({ resolver: zodResolver(buttonSchema as any), defaultValues: config })
  const v = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(form.getValues()) }, [JSON.stringify(v)])
  return <div className="space-y-3"><div className="space-y-1"><Label>Button label</Label><Input {...form.register('label')} placeholder="Click me" /></div><div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label>Variant</Label><Select value={form.watch('variant')} onValueChange={val => form.setValue('variant', val as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="solid">Solid</SelectItem><SelectItem value="outline">Outline</SelectItem><SelectItem value="ghost">Ghost</SelectItem><SelectItem value="soft">Soft</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>Size</Label><Select value={form.watch('size')} onValueChange={val => form.setValue('size', val as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="xs">XS</SelectItem><SelectItem value="sm">SM</SelectItem><SelectItem value="md">MD</SelectItem><SelectItem value="lg">LG</SelectItem></SelectContent></Select></div></div><div className="space-y-1"><Label>Icon (lucide name)</Label><Input {...form.register('icon')} placeholder="arrow-right" /></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" {...form.register('fullWidth')} /> Full width</label><Button type="button" variant="outline" size="sm" onClick={() => onChange({ label: 'Button', variant: 'solid', size: 'md' } as any)}>Reset</Button></div>
}
export default ButtonJourneyConfig
