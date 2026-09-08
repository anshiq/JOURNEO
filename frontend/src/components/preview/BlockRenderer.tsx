import * as React from 'react'
import { getDevice } from '../../nodes/_core/registry'
import { getNodeStyle } from '../../nodes/_core/preview'
import { evalVisibleWhen } from '../../lib/screen'
import type { LiveBlock, LiveSessionClient } from '../../lib/liveSession'

export default function BlockRenderer({ client, block, theme, values, errors, setValue, studio, isSelected, isFlashing, onSelect }: {
  client: LiveSessionClient
  block: LiveBlock
  theme: any
  values: Record<string, any>
  errors: Record<string, string>
  setValue: (key: string, v: any) => void
  studio?: boolean
  isSelected?: boolean
  isFlashing?: boolean
  onSelect?: (id: string | null) => void
}) {
  const Device = getDevice(block.type)
  const cfg = block.config || {}
  const hidden = React.useMemo(() => {
    if (!cfg.blockVisibleWhen) return false
    return !evalVisibleWhen(cfg.blockVisibleWhen, values, {})
  }, [cfg.blockVisibleWhen, values])
  if (hidden) return null
  if (!Device) return <div className="text-xs text-muted-foreground">Unsupported block: {block.type}</div>
  const key = cfg.blockKey
  const value = key ? values[key] : undefined
  const error = key ? errors[key] : undefined
  const border = studio && isSelected ? theme.primary : 'transparent'
  return (
    <div
      data-block-id={block.nodeId}
      onClick={studio ? e => { e.stopPropagation(); onSelect?.(block.nodeId) } : undefined}
      style={{
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: border,
        borderRadius: 8,
        boxShadow: studio && isFlashing ? `0 0 0 4px ${theme.primary}66` : undefined,
      }}
      className="relative"
    >
      {studio && isSelected && <div className="absolute -top-2 left-2 z-10 bg-foreground px-1.5 text-[9px] text-background">Selected</div>}
      <Device
        config={cfg}
        style={getNodeStyle(cfg)}
        theme={theme}
        blockId={block.nodeId}
        value={value}
        error={error || null}
        onChange={key ? (v: any) => setValue(key, v) : block.type === 'form' ? (v: any) => { if (v && typeof v === 'object') Object.entries(v).forEach(([field, next]) => setValue(field, next)) } : undefined}
        onAdvance={(handle?: string, payload?: any) => {
          const namespaced = handle ? `${block.nodeId}:${handle}` : `${block.nodeId}:default`
          client.sendChoice(namespaced, { ...values, ...(payload || {}) })
        }}
        isActive
        isFlashing={isFlashing}
        studio={studio}
        onSelect={studio ? () => onSelect?.(block.nodeId) : undefined}
      />
      {error && <div className="mt-1 text-[11px] text-red-600">{error}</div>}
    </div>
  )
}
