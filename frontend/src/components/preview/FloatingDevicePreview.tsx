import * as React from 'react'
import { GripVertical, Minus, Smartphone, ZoomIn, ZoomOut } from 'lucide-react'
import { getDevicePreset } from 'react-device-bezels'
import LiveAdStage from './LiveAdStage'
import { DEVICE_CHOICES, initialDeviceForViewport, viewportForDevice, type FrameDevice } from './devices'
import type { StartParams } from '../../lib/liveSession'
import { DEFAULT_VIEWPORT, type ViewportId } from '../../lib/viewports'

const initialDevice = initialDeviceForViewport

function fitZoom(name: FrameDevice): number {
  const outer = name === 'macbook-14'
    ? { w: 1512 + 32, h: 20 + 982 + 10 + 16 }
    : name === 'desktop-1440'
      ? { w: 1442, h: 942 }
      : (() => { const p = getDevicePreset(name); return { w: p.width + p.bezel * 2, h: p.height + p.bezel * 2 } })()
  return Math.max(0.25, Math.min(1, (window.innerHeight - 120) / outer.h))
}

export default function FloatingDevicePreview({ start, viewportId = DEFAULT_VIEWPORT, studio = false, askAiConfig }: { start: StartParams; viewportId?: ViewportId; studio?: boolean; askAiConfig?: any }) {
  const [pos, setPos] = React.useState(() => ({ x: Math.max(12, window.innerWidth - 440), y: 84 }))
  const [min, setMin] = React.useState(false)
  const [device, setDevice] = React.useState<FrameDevice>(() => initialDevice(viewportId))
  const [vp, setVp] = React.useState<ViewportId>(viewportId)
  const [zoom, setZoom] = React.useState(() => fitZoom(initialDevice(viewportId)))
  const stepZoom = (d: number) => setZoom(z => Math.max(0.25, Math.min(1, Math.round((z + d) * 100) / 100)))
  const cardRef = React.useRef<HTMLDivElement>(null)
  const drag = React.useRef<{ dx: number; dy: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    const card = cardRef.current
    if (!card) return
    const cr = card.getBoundingClientRect()
    drag.current = { dx: e.clientX - cr.left, dy: e.clientY - cr.top }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const card = cardRef.current
    if (!card) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const w = card.offsetWidth
    const x = Math.min(Math.max(120 - w, e.clientX - drag.current.dx), vw - 120)
    const y = Math.min(Math.max(0, e.clientY - drag.current.dy), Math.max(0, vh - 56))
    setPos({ x, y })
  }
  const endDrag = () => { drag.current = null }
  const groups = ['Phones', 'Foldables', 'Tablets', 'Laptops', 'Desktops']
  if (min) {
    return (
      <button type="button" onClick={() => setMin(false)} className="fixed bottom-5 right-5 z-[100] flex items-center gap-2 rounded-none border border-border bg-background px-4 py-2 text-xs font-medium shadow-overlay hover:bg-muted">
        <Smartphone className="h-4 w-4" /> Preview
      </button>
    )
  }
  return (
    <div ref={cardRef} className="fixed z-[100] flex flex-col overflow-hidden rounded-none border border-border bg-background shadow-overlay" style={{ left: pos.x, top: pos.y }}>
      <div className="flex shrink-0 cursor-grab touch-none items-center gap-1.5 border-b bg-muted/40 px-2 py-1.5 active:cursor-grabbing" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <select
          value={device}
          onChange={e => {
            const found = DEVICE_CHOICES.find(c => c.name === e.target.value)
            if (!found) return
            setDevice(found.name)
            setVp(viewportForDevice(found.name))
            setZoom(fitZoom(found.name))
          }}
          onPointerDown={e => e.stopPropagation()}
          className="h-6 min-w-0 flex-1 cursor-pointer rounded-none border bg-background px-1 text-[11px] font-medium"
          aria-label="Preview device"
        >
          {groups.map(g => (
            <optgroup key={g} label={g}>
              {DEVICE_CHOICES.filter(c => c.group === g).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </optgroup>
          ))}
        </select>
        <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={() => stepZoom(-0.05)} aria-label="Zoom out">
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="w-8 shrink-0 text-center font-mono text-[10px] text-muted-foreground">{Math.round(zoom * 100)}%</span>
        <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={() => stepZoom(0.05)} aria-label="Zoom in">
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={() => setMin(true)} aria-label="Minimize preview">
          <Minus className="h-3.5 w-3.5" />
        </button>
      </div>
      <LiveAdStage start={start} viewportId={vp} device={device} framed zoom={zoom} studio={studio} askAiConfig={askAiConfig} />
    </div>
  )
}
