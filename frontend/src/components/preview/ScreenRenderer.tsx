import * as React from 'react'
import { advanceLabel, backLabel } from '../../lib/screen'
import type { LiveBlock, LiveChoice, LiveScreenMeta, LiveSessionClient } from '../../lib/liveSession'
import { getNodeStyle } from '../../nodes/_core/preview'
import { useScreenForm } from './useScreenForm'
import BlockRenderer from './BlockRenderer'
import ScreenAdvanceBar from './ScreenAdvanceBar'
import type { StartParams } from '../../lib/liveSession'

export default function ScreenRenderer({ client, screen, blocks, choices, layout, start, studio, selectedBlockId, flashingBlockId, timeoutMs, onSelectBlock }: {
  client: LiveSessionClient
  screen: LiveScreenMeta
  blocks: LiveBlock[]
  choices: LiveChoice[]
  layout: { blockGap: number; advanceBarHeight: number; cardPadding: number }
  start: StartParams
  studio?: boolean
  selectedBlockId?: string | null
  flashingBlockId?: string | null
  timeoutMs?: number | null
  onSelectBlock?: (id: string | null) => void
}) {
  const form = useScreenForm(screen.id, blocks, screen.advance || {})
  const [overlay, setOverlay] = React.useState<Record<string, { config?: any; style?: any }>>({})
  React.useEffect(() => {
    const handler = (event: any) => {
      const p = event.detail || event
      setOverlay(prev => {
        const old = prev[p.nodeId] || {}
        return { ...prev, [p.nodeId]: { config: p.config ? { ...old.config, ...p.config } : old.config, style: p.style ? { ...old.style, ...p.style } : old.style } }
      })
    }
    window.addEventListener('journeo:node-update', handler as EventListener)
    return () => window.removeEventListener('journeo:node-update', handler as EventListener)
  }, [])
  const mergedBlocks = React.useMemo(() => blocks.map(block => {
    const p = overlay[block.nodeId]
    if (!p) return block
    return { ...block, config: { ...block.config, ...(p.config || {}), style: { ...(block.config?.style || {}), ...(p.style || {}) } } }
  }), [blocks, overlay])
  const visibleBlocks = React.useMemo(() => mergedBlocks.filter(block => {
    const rule = block.config?.blockVisibleWhen
    if (!rule) return true
    const scope = { ...form.values }
    const field = rule.field
    const v = scope[field]
    const expected = rule.value
    if (rule.operator === 'eq') return String(v ?? '') === String(expected ?? '')
    if (rule.operator === 'neq') return String(v ?? '') !== String(expected ?? '')
    if (rule.operator === 'contains') return String(v ?? '').includes(String(expected ?? ''))
    const a = Number(v)
    const b = Number(expected)
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false
    if (rule.operator === 'gt') return a > b
    if (rule.operator === 'lt') return a < b
    if (rule.operator === 'gte') return a >= b
    if (rule.operator === 'lte') return a <= b
    return true
  }), [mergedBlocks, form.values])
  const handleAdvance = React.useCallback(() => {
    const advance = screen.advance || {}
    client.sendChoice(advance.handle || 'default', form.collect())
  }, [client, form, screen.advance])
  const isRow = screen.layout?.mode !== 'grid' && screen.layout?.direction === 'row'
  const gridColumns = screen.layout?.mode === 'grid' ? Math.max(1, screen.layout.columns || 2) : 1
  const blockStyle: React.CSSProperties = screen.layout?.mode === 'grid'
    ? { display: 'grid', gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`, gap: screen.layout.gap || layout.blockGap }
    : { display: 'flex', flexDirection: screen.layout?.direction === 'row' ? 'row' : 'column', flexWrap: isRow ? 'wrap' : 'nowrap', gap: screen.layout?.gap || layout.blockGap }
  const surfaceStyle: React.CSSProperties = {
    ...blockStyle,
    alignItems: screen.layout?.align === 'center' ? 'center' : screen.layout?.align === 'end' ? 'flex-end' : screen.layout?.align === 'start' ? 'flex-start' : 'stretch',
    justifyContent: screen.layout?.justify === 'center' ? 'center' : screen.layout?.justify === 'end' ? 'flex-end' : screen.layout?.justify === 'between' ? 'space-between' : screen.layout?.justify === 'around' ? 'space-around' : 'flex-start',
    padding: screen.layout?.padding || 0,
    maxWidth: screen.layout?.maxWidth ? `min(${typeof screen.layout.maxWidth === 'number' ? `${screen.layout.maxWidth}px` : screen.layout.maxWidth}, 100%)` : '100%',
    minWidth: 0,
    width: '100%',
    boxSizing: 'border-box',
    overflowY: screen.layout?.scroll === 'hidden' ? 'hidden' : screen.layout?.scroll === 'paged' ? 'auto' : 'visible',
    overflowX: 'clip',
    scrollSnapType: screen.layout?.scroll === 'paged' ? 'y mandatory' : undefined,
  }
  return (
    <div className="relative w-full min-w-0 max-w-full" data-screen-id={screen.id}>
      {timeoutMs && <TimeoutCountdown timeoutMs={timeoutMs} resetKey={screen.id} />}
      <div className="mt-2" style={surfaceStyle}>
        {visibleBlocks.map(block => {
          const cfg = block.config || {}
          const style = getNodeStyle(cfg)
          const span = cfg.blockSpan ? Math.max(1, Math.min(cfg.blockSpan, gridColumns)) : undefined
          const gridColumn = span ? `span ${span}` : undefined
          return (
            <div key={block.nodeId} className="min-w-0 max-w-full" style={{ ...(style as React.CSSProperties), gridColumn, minWidth: 0, maxWidth: '100%', overflowWrap: 'break-word', scrollSnapAlign: screen.layout?.scroll === 'paged' ? 'start' : undefined }}>
              <BlockRenderer
                client={client}
                block={block}
                theme={screen.theme}
                values={form.values}
                errors={form.errors}
                setValue={form.setValue}
                studio={studio}
                isSelected={selectedBlockId === block.nodeId}
                isFlashing={flashingBlockId === block.nodeId}
                onSelect={onSelectBlock}
              />
            </div>
          )
        })}
      </div>
      <ScreenAdvanceBar
        theme={screen.theme}
        screen={screen}
        missing={form.missing}
        isValid={form.isValid}
        onAdvance={handleAdvance}
        onBack={() => client.sendBack()}
        advanceLabel={advanceLabel(screen as any, screen.theme?.cta)}
        backLabel={backLabel(screen as any)}
        disabledHint={screen.advance?.disabledHint}
      />
      {choices.length > 1 && <div className="sr-only" aria-live="polite">{choices.length} choices available</div>}
    </div>
  )
}

function TimeoutCountdown({ timeoutMs, resetKey }: { timeoutMs: number; resetKey: string }) {
  const [remaining, setRemaining] = React.useState(timeoutMs)
  React.useEffect(() => {
    setRemaining(timeoutMs)
    const started = Date.now()
    const timer = window.setInterval(() => setRemaining(Math.max(0, timeoutMs - (Date.now() - started))), 250)
    return () => window.clearInterval(timer)
  }, [resetKey, timeoutMs])
  return <div className="mb-2 text-[10px] opacity-70" aria-label={`Advancing in ${Math.ceil(remaining / 1000)} seconds`}>Auto-advance · {Math.ceil(remaining / 1000)}s</div>
}
