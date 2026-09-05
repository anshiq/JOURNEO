import * as React from 'react'
import { getDefinition } from './registry'
import type { NodeStyle, ThemeConfig } from './types'

export function JourneyConfigRouter({ type, config, onChange, errors }: { type: string; config: any; onChange: (next: any) => void; errors?: string[] }) {
  const def = getDefinition(type)
  const Cmp = def?.JourneyConfig
  if (!Cmp) return <div className="text-xs text-muted-foreground">No config for {type}</div>
  return <Cmp config={config} onChange={onChange} errors={errors} />
}
export function StyleConfigRouter({ type, style, onChange, theme }: { type: string; style: NodeStyle; onChange: (k: keyof NodeStyle, v: any) => void; theme: ThemeConfig }) {
  const def = getDefinition(type)
  const Cmp = def?.StyleConfig
  if (!Cmp) return null
  return <Cmp style={style} onChange={onChange} theme={theme} />
}
