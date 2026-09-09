import * as React from 'react'
import { getDefinition } from './registry'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import type { NodeStyle, ThemeConfig } from './types'

export function BlockMetaSection({ config, onChange }: { config: any; onChange: (next: any) => void }) {
  const cfg = config || {}
  return (
    <div className="mb-3 space-y-2 rounded-none border border-dashed p-2">
      <div className="space-y-1">
        <Label>Block key</Label>
        <Input
          value={cfg.blockKey ?? ''}
          placeholder="field_xxxx"
          onChange={e => onChange({ ...cfg, blockKey: e.target.value || undefined })}
        />
      </div>
      <label className="flex items-center gap-2 text-xs font-medium">
        <input type="checkbox" checked={Boolean(cfg.blockRequired)} onChange={e => onChange({ ...cfg, blockRequired: e.target.checked || undefined })} />
        Required
      </label>
      <label className="flex items-center gap-2 text-xs font-medium">
        <input type="checkbox" checked={Boolean(cfg.blockOwnsExit)} onChange={e => onChange({ ...cfg, blockOwnsExit: e.target.checked || undefined })} />
        Owns exit
      </label>
      <div className="space-y-1">
        <Label>Span (1-12)</Label>
        <Input type="number" min={1} max={12} value={cfg.blockSpan ?? ''} onChange={e => onChange({ ...cfg, blockSpan: e.target.value === '' ? undefined : Math.max(1, Math.min(12, Number(e.target.value))) })} />
      </div>
    </div>
  )
}

export function JourneyConfigRouter({ type, config, onChange, errors }: { type: string; config: any; onChange: (next: any) => void; errors?: string[] }) {
  const def = getDefinition(type)
  const Cmp = def?.JourneyConfig
  if (!Cmp) return <div className="text-xs text-muted-foreground">No config for {type}</div>
  const showBlock = !['trigger', 'condition', 'end', 'ask_ai'].includes(type)
  return (
    <div>
      {showBlock && <BlockMetaSection config={config} onChange={onChange} />}
      <Cmp config={config} onChange={onChange} errors={errors} />
    </div>
  )
}
export function StyleConfigRouter({ type, style, onChange, theme, config, onConfigChange }: { type: string; style: NodeStyle; onChange: (k: keyof NodeStyle, v: any) => void; theme: ThemeConfig; config?: any; onConfigChange?: (next: any) => void }) {
  const def = getDefinition(type)
  const Cmp = def?.StyleConfig
  if (!Cmp) return null
  return <Cmp style={style} onChange={onChange} theme={theme} config={config} onConfigChange={onConfigChange} />
}
