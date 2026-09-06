import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { journeyApi } from '../lib/api'
import { DEVICE_VIEWPORTS } from '../lib/viewports'
import LiveAdStage from '../components/preview/LiveAdStage'
import { useLiveViewport, useViewport } from '../lib/viewport'

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
  return (
    <main className="fixed inset-0 overflow-hidden">
      <LiveAdStage start={{ mode: 'live', campaignId: id }} viewportId={viewportId} />
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
  return (
    <main className="fixed inset-0 flex flex-col bg-white">
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <div className="mb-2 flex shrink-0 items-center justify-center gap-2 text-center font-mono text-[10px] tracking-widest text-amber-600">
          <span>DEV PREVIEW · /d/{token.slice(0, 8)} · noindex · {DEVICE_VIEWPORTS[viewportId].name}</span>
          <select value={viewportId} onChange={e => setViewportId(e.target.value as any)} className="rounded border bg-background px-1 py-0.5 font-sans text-[10px] text-foreground">
            {Object.entries(DEVICE_VIEWPORTS).map(([vid, v]) => <option key={vid} value={vid}>{v.name}</option>)}
          </select>
        </div>
        <div className="min-h-0 flex-1">
          <LiveAdStage start={{ mode: 'test', campaignId, devToken: token }} viewportId={viewportId} />
        </div>
      </div>
    </main>
  )
}
