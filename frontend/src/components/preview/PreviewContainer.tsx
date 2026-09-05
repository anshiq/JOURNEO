import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import AdStage from './AdStage'
import AdFrame from './AdFrame'
import ViewportToolbar from './ViewportToolbar'
import type { FlowEdge, FlowNode } from './types'
import { DEFAULT_VIEWPORT, viewportSpec, type ViewportId } from '../../lib/viewports'
import { useEvent } from '../../lib/eventBus'

export default function PreviewContainer({
  nodes,
  edges,
  viewportId: controlledId,
  onViewportChange,
  showToolbar = true,
  studio = true,
}: {
  nodes: FlowNode[]
  edges: FlowEdge[]
  viewportId?: ViewportId
  onViewportChange?: (id: ViewportId) => void
  showToolbar?: boolean
  studio?: boolean
}) {
  const [internalId, setInternalId] = useState<ViewportId>(controlledId || DEFAULT_VIEWPORT)
  const viewportId = controlledId ?? internalId
  const setViewportId = onViewportChange ?? setInternalId
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)

  useEvent('device:viewportChange', useCallback((p: any) => setViewportId(p.viewportId), [setViewportId]))

  const spec = viewportSpec(viewportId)
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const compute = () => {
      const cw = container.clientWidth
      const ch = container.clientHeight
      if (!cw || !ch) return
      const next = Math.min(1, cw / spec.width, ch / spec.height)
      setScale(prev => (Math.abs(prev - next) > 0.002 ? next : prev))
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(container)
    return () => ro.disconnect()
  }, [spec.width, spec.height])

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      {showToolbar && (
        <div className="shrink-0">
          <ViewportToolbar viewportId={viewportId} onChange={setViewportId} scale={scale} />
        </div>
      )}
      <div ref={containerRef} className="flex min-h-0 flex-1 w-full items-center justify-center overflow-hidden rounded-xl border bg-muted/20 p-2">
        {nodes.length === 0 ? (
          <div className="text-xs text-muted-foreground">Save a journey to preview</div>
        ) : (
          <AdFrame viewportId={viewportId} scale={scale}>
            <AdStage nodes={nodes} edges={edges} viewportId={viewportId} studio={studio} />
          </AdFrame>
        )}
      </div>
    </div>
  )
}
