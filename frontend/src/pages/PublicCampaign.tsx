import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { journeyApi } from '../lib/api'
import { parseGraph } from '../lib/journeyGraph'
import { DEVICE_VIEWPORTS, type ViewportId } from '../lib/viewports'
import LiveAdStage from '../components/preview/LiveAdStage'
import { useLiveViewport, useViewport } from '../lib/viewport'

function Notice({ title, body }: { title: string; body?: string }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      {body && <p className="mt-3 text-muted-foreground">{body}</p>}
    </main>
  )
}

function useGlobalAskAi(campaignId: string | null): any {
  const [askAi, setAskAi] = useState<any>(undefined)
  useEffect(() => {
    if (!campaignId) return
    let cancelled = false
    journeyApi.get(`/api/campaigns/${campaignId}/journey`).then(r => {
      if (cancelled || !r.data?.graphJson) return
      try {
        setAskAi(parseGraph(r.data.graphJson).askAi ?? undefined)
      } catch {
      }
    }).catch(() => {
    })
    return () => { cancelled = true }
  }, [campaignId])
  return askAi
}

export default function PublicCampaign() {
  const { token } = useParams() as any
  return token ? <DevPreview token={token} /> : <LiveAd />
}

function LiveAd() {
  const { id } = useParams() as any
  const [searchParams] = useSearchParams()
  const viewportId = useLiveViewport(searchParams.get('viewport'))
  const [exists, setExists] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    journeyApi.get(`/api/campaigns/${id}`).then(() => { if (!cancelled) setExists(true) }).catch(() => { if (!cancelled) setExists(false) })
    return () => { cancelled = true }
  }, [id])
  if (exists === null) return null
  if (!exists) return <Notice title="Campaign unavailable" body="This campaign link is invalid or is no longer available." />
  return <LiveAdContent id={id} viewportId={viewportId} />
}

function LiveAdContent({ id, viewportId }: { id: string; viewportId: ViewportId }) {
  const askAi = useGlobalAskAi(id)
  return (
    <main className="fixed inset-0 overflow-hidden">
      <LiveAdStage start={{ mode: 'live', campaignId: id }} viewportId={viewportId} askAiConfig={askAi} />
    </main>
  )
}

function DevPreview({ token }: { token: string }) {
  const { viewportId, setViewportId } = useViewport()
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    journeyApi.get(`/api/campaigns/dev/${token}`).then(r => { if (!cancelled) setCampaignId(r.data.id) }).catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [token])
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => { document.head.removeChild(meta) }
  }, [])
  if (failed) return <Notice title="Campaign unavailable" body="This dev link is invalid or has been rotated." />
  if (!campaignId) return null
  return <DevPreviewContent token={token} campaignId={campaignId} viewportId={viewportId} setViewportId={setViewportId} />
}

function DevPreviewContent({ token, campaignId, viewportId, setViewportId }: { token: string; campaignId: string; viewportId: ViewportId; setViewportId: (v: ViewportId) => void }) {
  const askAi = useGlobalAskAi(campaignId)
  return (
    <main className="fixed inset-0 flex flex-col bg-white">
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <div className="mb-2 flex shrink-0 items-center justify-center gap-2 text-center font-mono text-[10px] tracking-widest text-muted-foreground">
          <span>DEV PREVIEW · /d/{token.slice(0, 8)} · noindex · {DEVICE_VIEWPORTS[viewportId].name}</span>
          <select value={viewportId} onChange={e => setViewportId(e.target.value as any)} className="rounded-none border bg-background px-1 py-0.5 font-sans text-[10px] text-foreground">
            {Object.entries(DEVICE_VIEWPORTS).map(([vid, v]) => <option key={vid} value={vid}>{v.name}</option>)}
          </select>
        </div>
        <div className="min-h-0 flex-1">
          <LiveAdStage start={{ mode: 'test', campaignId, devToken: token }} viewportId={viewportId} askAiConfig={askAi} />
        </div>
      </div>
    </main>
  )
}
