import { useEffect } from 'react'
import { getDevice } from '../../nodes/_core/registry'
import { getTheme, getNodeStyle } from '../../nodes/_core/preview'
import { adLayoutFor, DEFAULT_VIEWPORT, type ViewportId } from '../../lib/viewports'
import { useFlowRuntime } from './useFlowRuntime'
import type { FlowEdge, FlowNode, NodeExecutionState, ThemeConfig } from './types'

export default function AdStage({ nodes, edges, viewportId = DEFAULT_VIEWPORT, studio = false, startNodeId }: { nodes: FlowNode[]; edges: FlowEdge[]; viewportId?: ViewportId; studio?: boolean; startNodeId?: string }) {
  const runtime = useFlowRuntime({ nodes, edges, viewportId, studio, startNodeId })
  const layout = adLayoutFor(viewportId)
  const node = runtime.node
  const theme = getTheme(node?.config)
  const autoResolve = !studio && node?.type === 'condition'
  useEffect(() => {
    if (!autoResolve) return
    const handle = runtime.edges.some(e => e.source === node!.id && e.sourceHandle === 'false') ? 'false' : undefined
    const t = window.setTimeout(() => runtime.advance(handle), 0)
    return () => window.clearTimeout(t)
  }, [autoResolve, node?.id])

  return (
    <div
      data-ad-stage
      data-viewport={viewportId}
      data-mode={studio ? 'studio' : 'live'}
      className="h-full w-full overflow-y-auto overflow-x-hidden"
      style={{ backgroundColor: theme.surface, color: theme.foreground, fontFamily: theme.font }}
    >
      <div className="flex min-h-full w-full justify-center" style={{ padding: layout.stagePadding }}>
        <div data-ad-content className="my-auto w-full" style={{ maxWidth: layout.contentMaxWidth }}>
          {runtime.nodes.length === 0
            ? <StageMessage theme={theme} title="Nothing to show" body="This campaign has no content yet." />
            : runtime.finished || !node
              ? <AdComplete theme={theme} studio={studio} onRestart={runtime.restart} />
              : autoResolve
                ? null
                : <AdCard
                    node={node}
                    theme={theme}
                    cardPadding={layout.cardPadding}
                    studio={studio}
                    isSelected={runtime.selectedId === node.id}
                    isFlashing={runtime.flashingId === node.id}
                    nodeState={runtime.nodeState}
                    onAdvance={runtime.advance}
                    onSelect={() => runtime.selectNode(node.id)}
                  />}
        </div>
      </div>
    </div>
  )
}

function AdCard({ node, theme, cardPadding, studio, isSelected, isFlashing, nodeState, onAdvance, onSelect }: {
  node: FlowNode
  theme: ThemeConfig
  cardPadding: number
  studio: boolean
  isSelected: boolean
  isFlashing: boolean
  nodeState?: NodeExecutionState
  onAdvance: (handle?: string) => void
  onSelect: () => void
}) {
  const cfg = node.config || {}
  const nodeStyle = getNodeStyle(cfg)
  const Device = getDevice(node.type) as any
  const highlight = nodeState?.highlightColor || 'transparent'
  const card: React.CSSProperties = {
    borderRadius: theme.radius,
    backgroundColor: theme.surface,
    color: theme.foreground,
    fontFamily: theme.font,
    padding: cardPadding,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: studio && isSelected ? highlight : 'transparent',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }
  if (studio && isFlashing) {
    card.boxShadow = `0 0 0 4px ${theme.primary}66, 0 0 28px ${theme.primary}55`
    card.borderColor = theme.primary
  }
  return (
    <div data-ad-card={node.type} className="relative" style={{ ['--theme-primary' as any]: theme.primary } as React.CSSProperties} onClick={studio ? (e => { e.stopPropagation(); onSelect() }) : undefined}>
      {studio && isSelected && <div className="absolute -top-2 left-1/2 z-30 -translate-x-1/2 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] text-white">Selected</div>}
      <div style={card} className="overflow-hidden">
        {Device
          ? <Device config={cfg} style={nodeStyle} theme={theme} studio={studio} isActive={nodeState?.isActive} isFlashing={studio && isFlashing} onAdvance={onAdvance} onSelect={studio ? onSelect : undefined} />
          : <div className="text-xs text-slate-400">Unknown node type: {node.type}</div>}
      </div>
    </div>
  )
}

function AdComplete({ theme, studio, onRestart }: { theme: ThemeConfig; studio: boolean; onRestart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center" style={{ fontFamily: theme.font, color: theme.foreground }}>
      <div className="text-4xl">🎉</div>
      <div className="text-lg font-semibold">That&apos;s a wrap</div>
      <div className="text-sm opacity-70">Thanks for exploring this experience.</div>
      {studio && <button onClick={onRestart} className="mt-2 rounded px-3 py-1.5 text-xs text-white" style={{ backgroundColor: theme.primary, borderRadius: theme.radius }}>Play again</button>}
    </div>
  )
}

function StageMessage({ theme, title, body }: { theme: ThemeConfig; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center" style={{ fontFamily: theme.font, color: theme.foreground }}>
      <div className="text-base font-semibold">{title}</div>
      <div className="text-sm opacity-70">{body}</div>
    </div>
  )
}
