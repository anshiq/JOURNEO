import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { buttonSchema } from './schema'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { JourneyConfigProps } from '../_core/config'
import { BreakpointTabs } from '../_core/journeyWidgets'
import type { z } from 'zod'
type Config = z.infer<typeof buttonSchema>
export const ButtonJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange }) => {
  const form = useForm<any>({ resolver: zodResolver(buttonSchema as any), defaultValues: config })
  const v = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(form.getValues()) }, [JSON.stringify(v)])
  const responsive = form.watch('responsive')
  return <div className="space-y-3"><div className="space-y-1"><Label>Button label</Label><Input {...form.register('label')} placeholder="Click me" /></div><div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label>Variant</Label><Select value={form.watch('variant')} onValueChange={val => form.setValue('variant', val as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="solid">Solid</SelectItem><SelectItem value="outline">Outline</SelectItem><SelectItem value="ghost">Ghost</SelectItem><SelectItem value="soft">Soft</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>Size</Label><Select value={form.watch('size')} onValueChange={val => form.setValue('size', val as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="xs">XS</SelectItem><SelectItem value="sm">SM</SelectItem><SelectItem value="md">MD</SelectItem><SelectItem value="lg">LG</SelectItem></SelectContent></Select></div></div><div className="space-y-1"><Label>Icon (lucide name)</Label><Input {...form.register('icon')} placeholder="arrow-right" /></div>
    <div className="flex items-center gap-4"><label className="flex items-center gap-2 text-xs"><input type="checkbox" {...form.register('fullWidth')} /> Full width</label><label className="flex items-center gap-2 text-xs"><input type="checkbox" {...form.register('loading')} /> Loading</label><label className="flex items-center gap-2 text-xs"><input type="checkbox" {...form.register('disabled')} /> Disabled</label></div>
    <div className="space-y-1"><Label>Analytics event name</Label><Input {...form.register('analyticsEvent')} placeholder="cta_click" /></div>
    <BreakpointTabs
      base={form.getValues()}
      responsive={responsive}
      onChange={next => form.setValue('responsive', next as any)}
      renderFields={(value, set) => <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1"><span className="text-[11px] font-medium text-muted-foreground">Size (override)</span><Select value={value.size || ''} onValueChange={val => set({ size: val as any })}><SelectTrigger><SelectValue placeholder="Inherit" /></SelectTrigger><SelectContent><SelectItem value="xs">XS</SelectItem><SelectItem value="sm">SM</SelectItem><SelectItem value="md">MD</SelectItem><SelectItem value="lg">LG</SelectItem></SelectContent></Select></div>
        <label className="flex items-end gap-2 text-xs"><input type="checkbox" checked={Boolean(value.fullWidth)} onChange={e => set({ fullWidth: e.target.checked })} /> Full width (override)</label>
      </div>}
    />
    <Button type="button" variant="outline" size="sm" onClick={() => onChange({ label: 'Button', variant: 'solid', size: 'md' } as any)}>Reset</Button></div>
}
export default ButtonJourneyConfig
