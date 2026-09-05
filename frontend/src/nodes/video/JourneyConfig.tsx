import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { videoSchema } from './schema'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof videoSchema>
export const VideoJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange }) => {
  const form = useForm<any>({ resolver: zodResolver(videoSchema as any), defaultValues: config })
  const v = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(form.getValues()) }, [JSON.stringify(v)])
  return <div className="space-y-3"><div className="space-y-1"><Label>Video URL (YouTube)</Label><Input {...form.register('url')} placeholder="https://youtube.com/watch?v=..." /></div><div className="space-y-1"><Label>Or direct video src</Label><Input {...form.register('src')} placeholder="https://..." /></div><div className="space-y-1"><Label>Thumbnail URL</Label><Input {...form.register('poster')} placeholder="https://..." /></div><div className="flex items-center gap-2"><label className="flex items-center gap-1 text-xs"><input type="checkbox" {...form.register('autoplay')} /> Autoplay</label><label className="flex items-center gap-1 text-xs"><input type="checkbox" {...form.register('loop')} /> Loop</label><label className="flex items-center gap-1 text-xs"><input type="checkbox" {...form.register('controls')} /> Controls</label></div><div className="flex items-center gap-2"><label className="flex items-center gap-1 text-xs"><input type="checkbox" {...form.register('showWatchedButton')} /> Watched btn</label><label className="flex items-center gap-1 text-xs"><input type="checkbox" {...form.register('showSkipButton')} /> Skip btn</label></div><div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label>Watched label</Label><Input {...form.register('watchedLabel')} /></div><div className="space-y-1"><Label>Skip label</Label><Input {...form.register('skipLabel')} /></div></div><Button type="button" variant="outline" size="sm" onClick={() => onChange({ controls: true } as any)}>Reset</Button></div>
}
export default VideoJourneyConfig
