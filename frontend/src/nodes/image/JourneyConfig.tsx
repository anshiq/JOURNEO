import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { imageSchema } from './schema'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof imageSchema>
export const ImageJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange }) => {
  const form = useForm<any>({ resolver: zodResolver(imageSchema as any), defaultValues: config })
  const v = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(form.getValues()) }, [JSON.stringify(v)])
  return <div className="space-y-3"><div className="space-y-1"><Label>Image URL</Label><Input {...form.register('src')} placeholder="https://..." /></div><div className="space-y-1"><Label>Alt text</Label><Input {...form.register('alt')} placeholder="Describe image" /></div><div className="space-y-1"><Label>Aspect ratio</Label><Input {...form.register('aspectRatio')} placeholder="16/9" /></div>{form.watch('src') && <img src={form.watch('src')} alt="" className="h-20 w-full object-cover rounded border" />}<Button type="button" variant="outline" size="sm" onClick={() => onChange({ src: '', alt: '' } as any)}>Reset</Button></div>
}
export default ImageJourneyConfig
