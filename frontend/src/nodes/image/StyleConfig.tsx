import * as React from 'react'
import { Image as ImageIcon } from 'lucide-react'
import type { StyleConfigProps } from '../_core/config'
import { FileUploader } from '@/components/ui/FileUploader'
import { ColorFieldWithHex, TextField, SelectField, SegmentedControl, NumberField } from '../_core/styleWidgets'
export const ImageStyleConfig: React.FC<StyleConfigProps> = ({ style, onChange, theme, config, onConfigChange }) => {
  const cfg = config || {}
  const setCfg = (patch: any) => onConfigChange?.({ ...cfg, ...patch })
  return <div className="space-y-4">{onConfigChange && <div className="space-y-3 rounded-lg border bg-muted/20 p-3"><div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><ImageIcon className="h-3.5 w-3.5" /> Image source</div><TextField label="Image URL" value={cfg.src || ''} onChange={v => setCfg({ src: v || '' })} placeholder="https://..." /><FileUploader value={cfg.src || ''} onChange={url => setCfg({ src: url })} kind="image" maxSizeMB={25} /><TextField label="Alt text" value={cfg.alt || ''} onChange={v => setCfg({ alt: v || '' })} placeholder="Describe image" /><TextField label="Aspect ratio" value={cfg.aspectRatio || ''} onChange={v => setCfg({ aspectRatio: v || '' })} placeholder="16/9" />{cfg.src && <img src={cfg.src} alt="" className="h-20 w-full object-cover rounded border" />}</div>}<TextField label="Radius" value={style.borderRadius} onChange={v => onChange('borderRadius', v)} placeholder="8px" /><SelectField label="Style" value={style.borderStyle} onChange={v => onChange('borderStyle', v)} options={[{value:'solid',label:'Solid'},{value:'dashed',label:'Dashed'},{value:'none',label:'None'}]} /><TextField label="Width" value={style.borderWidth} onChange={v => onChange('borderWidth', v)} placeholder="1px" />
<TextField label="Padding" value={style.padding} onChange={v => onChange('padding', v)} placeholder="12px" /><TextField label="Gap" value={style.gap} onChange={v => onChange('gap', v)} placeholder="8px" />
<div className="grid grid-cols-2 gap-2"><TextField label="Width" value={style.width} onChange={v => onChange('width', v)} placeholder="auto" /><TextField label="Height" value={style.height} onChange={v => onChange('height', v)} placeholder="auto" /></div>
<SelectField label="Shadow" value={(style as any).boxShadow} onChange={v => onChange('boxShadow' as any, v)} options={[{value:'none',label:'None'},{value:'0 4px 12px rgba(15,23,42,0.10)',label:'Medium'},{value:'0 12px 32px rgba(15,23,42,0.16)',label:'Elevated'}]} /><NumberField label="Opacity" value={style.opacity} onChange={v => onChange('opacity', v)} min={0} max={1} step={0.05} placeholder="1" />
</div>
}
export default ImageStyleConfig
