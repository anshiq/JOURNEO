import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { journeyApi } from '../lib/api'
import type { FlowEdge, FlowNode } from '../components/preview/types'
import { DEVICE_VIEWPORTS } from '../lib/viewports'
import AdStage from '../components/preview/AdStage'
import PreviewContainer from '../components/preview/PreviewContainer'
import { useLiveViewport, useViewport } from '../lib/viewport'

type Graph = { nodes: FlowNode[]; edges: FlowEdge[] }

function parseGraph(graphJson?: string): Graph {
  if (!graphJson) return { nodes: [], edges: [] }
  try {
    const g = JSON.parse(graphJson)
    return {
      nodes: (g.nodes || []).map((n: any) => ({ id: n.id, type: n.type, config: n.config || {} })),
      edges: (g.edges || []).map((e: any) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, label: e.label })),
    }
  } catch { return { nodes: [], edges: [] } }
}

function Notice({ title, body }: { title: string; body?: string }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      {body && <p className="mt-3 text-slate-600">{body}</p>}
    </main>
  )
}

export default function PublicCampaign() {
  const { token } = useParams() as any
  return token ? <DevPreview token={token} /> : <LiveAd />
}

function useCampaignGraph({ campaignId, devToken }: { campaignId?: string; devToken?: string }) {
  const [campaign, setCampaign] = useState<any>(null)
  const [journey, setJourney] = useState<any>(null)
  const [graph, setGraph] = useState<Graph>({ nodes: [], edges: [] })
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const c = devToken
          ? (await journeyApi.get(`/api/campaigns/dev/${devToken}`)).data
          : (await journeyApi.get(`/api/campaigns/${campaignId}`)).data
        if (cancelled) return
        setCampaign(c)
        const list = (await journeyApi.get(`/api/campaigns/${c.id}/journeys`)).data || []
        if (cancelled) return
        const j = devToken ? (list[0] || null) : (list.find((item: any) => item.status === 'PUBLISHED') || null)
        setJourney(j)
        setGraph(parseGraph(j?.graphJson))
      } catch {
        if (!cancelled) setCampaign(false)
      } finally {
        if (!cancelled) setReady(true)
      }
    }
    if (campaignId || devToken) load()
    return () => { cancelled = true }
  }, [campaignId, devToken])
  return { campaign, journey, graph, ready }
}

function LiveAd() {
  const { id } = useParams() as any
  const [searchParams] = useSearchParams()
  const { campaign, journey, graph, ready } = useCampaignGraph({ campaignId: id })
  const viewportId = useLiveViewport(searchParams.get('viewport'))
  const startNodeId = useMemo(() => {
    const requested = searchParams.get('n') || searchParams.get('node')
    return requested && graph.nodes.some(n => n.id === requested) ? requested : undefined
  }, [searchParams, graph.nodes])
  if (!ready) return null
  if (campaign === false) return <Notice title="Campaign unavailable" body="This campaign link is invalid or is no longer available." />
  if (!journey || graph.nodes.length === 0) return <Notice title="Campaign is not live yet" body="Please check back after the campaign has been published." />
  return (
    <main className="fixed inset-0 overflow-hidden">
      <AdStage nodes={graph.nodes} edges={graph.edges} viewportId={viewportId} studio={false} startNodeId={startNodeId} />
    </main>
  )
}

function DevPreview({ token }: { token: string }) {
  const { campaign, journey, graph, ready } = useCampaignGraph({ devToken: token })
  const { viewportId, setViewportId } = useViewport()
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => { document.head.removeChild(meta) }
  }, [])
  if (!ready) return null
  if (campaign === false) return <Notice title="Campaign unavailable" body="This dev link is invalid or has been rotated." />
  if (!journey || graph.nodes.length === 0) return <Notice title="No journey yet" body="Save a journey in the workspace to see it here." />
  return (
    <main className="fixed inset-0 flex flex-col bg-white">
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <div className="mb-2 shrink-0 text-center font-mono text-[10px] tracking-widest text-amber-600">
          DEV PREVIEW · /d/{token.slice(0, 8)} · noindex · {DEVICE_VIEWPORTS[viewportId].name}
        </div>
        <div className="min-h-0 flex-1">
          <PreviewContainer nodes={graph.nodes} edges={graph.edges} viewportId={viewportId} onViewportChange={setViewportId} showToolbar studio={false} />
        </div>
      </div>
    </main>
  )
}
