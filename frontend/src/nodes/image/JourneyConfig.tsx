import * as React from 'react'
import type { JourneyConfigProps } from '../_core/config'
import { FileUploader } from '@/components/ui/FileUploader'
import { TextField } from '../_core/styleWidgets'
import { BreakpointTabs } from '../_core/journeyWidgets'
import { Button } from '@/components/ui/Button'
import { aiApi } from '../../lib/api'
export const ImageJourneyConfig: React.FC<JourneyConfigProps> = ({ config, onChange }) => {
  const cfg = config || {}
  const [suggesting, setSuggesting] = React.useState(false)
  const suggestAlt = () => {
    if (!cfg.src) return
    setSuggesting(true)
    aiApi.post('/v1/vision/alt-text', { imageUrl: cfg.src })
      .then(res => { if (res.data?.alt) onChange({ ...cfg, alt: res.data.alt }) })
      .finally(() => setSuggesting(false))
  }
  return <div className="space-y-2"><div className="overflow-hidden rounded-none border bg-muted/30"><svg viewBox="0 0 320 180" className="h-36 w-full" role="img" aria-label="Sample image"><rect x="0" y="0" width="320" height="180" fill="hsl(var(--muted))" /><circle cx="248" cy="48" r="22" fill="hsl(var(--muted-foreground))" opacity="0.35" /><polygon points="0,180 110,70 190,180" fill="hsl(var(--muted-foreground))" opacity="0.3" /><polygon points="110,180 210,50 320,180" fill="hsl(var(--muted-foreground))" opacity="0.45" /><rect x="0" y="0" width="320" height="180" fill="none" stroke="hsl(var(--border))" strokeWidth="2" /></svg></div><div className="space-y-3 rounded-none border bg-muted/20 p-3"><TextField label="Image URL" value={cfg.src || ''} onChange={v => onChange({ ...cfg, src: v || '' })} placeholder="https://..." /><FileUploader value={cfg.src || ''} onChange={url => onChange({ ...cfg, src: url })} kind="image" maxSizeMB={25} /><div className="flex items-end gap-2"><div className="flex-1"><TextField label="Alt text" value={cfg.alt || ''} onChange={v => onChange({ ...cfg, alt: v || '' })} placeholder="Describe image" /></div><Button type="button" variant="outline" size="sm" disabled={!cfg.src || suggesting} onClick={suggestAlt}>{suggesting ? 'Suggesting…' : 'Suggest alt text'}</Button></div></div>
    <BreakpointTabs
      base={cfg}
      responsive={cfg.responsive}
      onChange={next => onChange({ ...cfg, responsive: next })}
      renderFields={(value, set) => <div className="space-y-2">
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground">Image (override)</span>
          <FileUploader value={value.src || ''} onChange={src => set({ src })} kind="image" maxSizeMB={25} />
        </div>
        <TextField label="Alt text (override)" value={value.alt} onChange={v => set({ alt: v })} placeholder={cfg.alt || 'Describe the image'} />
        <TextField label="Focal point (override)" value={value.focalPoint} onChange={v => set({ focalPoint: v })} placeholder="50% 50%" />
      </div>}
    />
  </div>
}
export default ImageJourneyConfig
