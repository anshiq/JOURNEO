import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { DeviceFrame, getDevicePreset } from 'react-device-bezels'
import 'react-device-bezels/styles.css'
import { initialDeviceForViewport, type FrameDevice } from './devices'
export type { FrameDevice } from './devices'

import { adLayoutFor, DEFAULT_VIEWPORT, type ViewportId } from '../../lib/viewports'
import { LiveSessionClient, type LiveState, type StartParams } from '../../lib/liveSession'
import { DEFAULT_THEME } from '../../lib/journeyGraph'
import AskAiOverlay from './AskAiOverlay'
import ScreenRenderer from './ScreenRenderer'
import { bus } from '../../lib/eventBus'

const deviceFor = initialDeviceForViewport
const MAC_SCREEN = { w: 1512, h: 982 }
const MAC_BEZEL = { x: 16, top: 20, bottom: 10 }
const MAC_BASE = 16
const DESK_SCREEN = { w: 1440, h: 900 }
const DESK_CHROME = 40

function outerSize(name: FrameDevice | undefined): { w: number; h: number } {
  if (name === 'macbook-14') return { w: MAC_SCREEN.w + MAC_BEZEL.x * 2, h: MAC_BEZEL.top + MAC_SCREEN.h + MAC_BEZEL.bottom + MAC_BASE }
  if (name === undefined || name === 'desktop-1440') return { w: DESK_SCREEN.w + 2, h: DESK_CHROME + DESK_SCREEN.h + 2 }
  const p = getDevicePreset(name)
  return { w: p.width + p.bezel * 2, h: p.height + p.bezel * 2 }
}

function FramedScreen({ viewportId, device, children, zoom: fixedZoom }: { viewportId: ViewportId; device?: FrameDevice; children: React.ReactNode; zoom?: number }) {
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const name = device ?? deviceFor(viewportId)
  const outer = outerSize(name)
  const [fit, setFit] = React.useState(0.5)
  const zoom = fixedZoom ?? fit
  React.useEffect(() => {
    if (fixedZoom !== undefined) return
    const el = wrapRef.current
    if (!el) return
    const compute = () => {
      const r = el.getBoundingClientRect()
      const z = Math.min((r.width - 16) / outer.w, (r.height - 16) / outer.h)
      setFit(Math.max(0.2, Math.min(1, Number.isFinite(z) ? z : 0.5)))
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [name, fixedZoom, outer.w, outer.h])
  return (
    <div ref={wrapRef} className="flex h-full w-full items-center justify-center overflow-hidden rounded-none border border-border bg-muted p-2 shadow-overlay">
      {name === 'macbook-14' ? (
        <div style={{ width: outer.w * zoom, height: outer.h * zoom, flexShrink: 0 }}>
          <div style={{ width: outer.w, height: outer.h, transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
            <div className="bg-neutral-900" style={{ borderRadius: '20px 20px 0 0', padding: `${MAC_BEZEL.top}px ${MAC_BEZEL.x}px ${MAC_BEZEL.bottom}px`, position: 'relative' }}>
              <div className="absolute left-1/2 top-1.5 h-2.5 w-24 -translate-x-1/2 rounded-full bg-black" />
              <div className="overflow-hidden bg-white" style={{ width: MAC_SCREEN.w, height: MAC_SCREEN.h, borderRadius: 8 }}>{children}</div>
            </div>
            <div className="bg-neutral-700" style={{ height: MAC_BASE, borderRadius: '0 0 16px 16px' }}><div className="mx-auto h-1.5 w-24 rounded-b-lg bg-neutral-800" /></div>
          </div>
        </div>
      ) : name === undefined || name === 'desktop-1440' ? (
        <div className="overflow-hidden rounded-none border bg-white shadow-overlay" style={{ width: outer.w * zoom, height: outer.h * zoom, flexShrink: 0 }}>
          <div style={{ width: outer.w, height: outer.h, transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
            <div className="flex h-10 items-center gap-1.5 border-b bg-muted/60 px-3"><span className="h-2.5 w-2.5 rounded-full bg-neutral-500" /><span className="h-2.5 w-2.5 rounded-full bg-neutral-400" /><span className="h-2.5 w-2.5 rounded-full bg-neutral-300" /><span className="ml-2 h-6 flex-1 rounded-none bg-background" /></div>
            <div style={{ width: DESK_SCREEN.w, height: DESK_SCREEN.h }}>{children}</div>
          </div>
        </div>
      ) : <DeviceFrame device={name} zoom={zoom}>{children}</DeviceFrame>}
    </div>
  )
}

export default function LiveAdStage({ start, viewportId = DEFAULT_VIEWPORT, framed = false, zoom, device, studio = false, askAiConfig }: { start: StartParams; viewportId?: ViewportId; framed?: boolean; zoom?: number; device?: FrameDevice; studio?: boolean; askAiConfig?: any }) {
  const ref = React.useRef<LiveSessionClient | null>(null)
  if (!ref.current) ref.current = new LiveSessionClient()
  const client = ref.current
  const [state, setState] = React.useState<LiveState>(client.state)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [flashingId, setFlashingId] = React.useState<string | null>(null)
  const flashTimer = React.useRef<number | null>(null)
  const previousScreen = React.useRef<string | null>(null)
  const key = `${start.mode}|${start.campaignId || ''}|${start.journeyId || ''}|${start.devToken || ''}`
  React.useEffect(() => {
    const off = client.subscribe(setState)
    client.connect(start)
    return () => { off(); client.close() }
  }, [key])
  const screenState = state.status === 'screen' ? state : null
  const screen = screenState?.screen || null
  const layout = adLayoutFor(viewportId)
  const theme = screen?.theme || DEFAULT_THEME
  const flash = React.useCallback((id: string) => {
    setFlashingId(id)
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlashingId(null), 500)
  }, [])
  React.useEffect(() => () => { if (flashTimer.current) window.clearTimeout(flashTimer.current) }, [])
  React.useEffect(() => {
    if (!studio || !screenState) return
    if (previousScreen.current === screenState.screen.id) return
    previousScreen.current = screenState.screen.id
    const first = screenState.blocks[0]?.nodeId || null
    setSelectedId(first)
    bus.emit('screen:select', { screenId: screenState.screen.id, source: 'device' })
    if (first) bus.emit('node:select', { nodeId: first, source: 'device' })
  }, [studio, screenState])
  React.useEffect(() => {
    if (!studio) return
    const onNode = (p: any) => {
      if (!p.nodeId) { setSelectedId(null); return }
      setSelectedId(p.nodeId)
      const current = screenState?.blocks.some(b => b.nodeId === p.nodeId)
      if (current) flash(p.nodeId)
      else if (p.source === 'canvas' || p.source === 'toolbar') client.sendGoto({ nodeId: p.nodeId })
    }
    const onScreen = (p: any) => {
      if (p.screenId && p.source !== 'device') client.sendGoto({ screenId: p.screenId })
    }
    bus.on('node:select', onNode as any)
    bus.on('screen:select', onScreen as any)
    return () => { bus.off('node:select', onNode as any); bus.off('screen:select', onScreen as any) }
  }, [studio, screenState, client, flash])
  React.useEffect(() => {
    const handler = (p: any) => window.dispatchEvent(new CustomEvent('journeo:node-update', { detail: p }))
    bus.on('node:update', handler as any)
    return () => bus.off('node:update', handler as any)
  }, [])
  const askAi = askAiConfig
  const content = (
    <div data-ad-content className="my-auto w-full min-w-0 max-w-full break-words" style={{ maxWidth: `min(${layout.contentMaxWidth}px, 100%)` }}>
      {state.status === 'connecting' || state.status === 'stale' ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /><p className="text-sm text-muted-foreground">{state.status === 'stale' ? 'Updating to the latest…' : 'Loading experience…'}</p></div>
      ) : state.status === 'error' ? (
        <div className="py-16 text-center"><p className="text-sm font-medium">Experience unavailable</p><p className="mt-1 text-xs text-muted-foreground">{state.message}</p><button onClick={() => client.restart()} className="mt-4 rounded-none px-4 py-2 text-sm text-white" style={{ backgroundColor: theme.primary, borderRadius: theme.radius }}>Retry</button></div>
      ) : state.status === 'ended' ? (
        <div className="py-16 text-center"><p className="text-sm font-medium">Journey complete</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{state.sessionId.slice(0, 8)}</p><button onClick={() => client.restart()} className="mt-4 rounded-none px-4 py-2 text-sm text-white" style={{ backgroundColor: theme.primary, borderRadius: theme.radius }}>Restart</button></div>
      ) : screenState ? (
        <ScreenRenderer client={client} screen={screenState.screen} blocks={screenState.blocks} choices={screenState.choices} layout={layout} start={start} studio={studio} selectedBlockId={selectedId} flashingBlockId={flashingId} timeoutMs={screenState.timeoutMs} onSelectBlock={id => { setSelectedId(id); bus.emit('node:select', { nodeId: id, source: 'device' }) }} />
      ) : null}
    </div>
  )
  const stage = (
    <div data-ad-stage data-viewport={viewportId} data-mode="live" className="relative h-full w-full overflow-hidden" style={{ backgroundColor: theme.surface, color: theme.foreground, fontFamily: theme.font }}>
      <div data-ad-scroll className="h-full w-full overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="flex min-h-full w-full justify-center" style={{ padding: layout.stagePadding }}>{content}</div>
      </div>
      {askAi && <AskAiOverlay client={client} config={askAi} sessionStatus={state.status} theme={theme} start={start} screenId={screen?.id} />}
    </div>
  )
  if (!framed) return stage
  return <div data-ad-stage data-viewport={viewportId} data-mode="live" className="h-full w-full"><FramedScreen viewportId={viewportId} device={device} zoom={zoom}>{stage}</FramedScreen></div>
}
