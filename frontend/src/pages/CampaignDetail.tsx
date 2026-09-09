import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { journeyApi } from '../lib/api'
import { devLinkFor } from '../lib/devLink'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Separator } from '../components/ui/Separator'
import { Skeleton } from '../components/ui/Skeleton'
import { toast } from 'sonner'

export default function CampaignDetail(){
  const {id}=useParams()
  const qc=useQueryClient()
  const {data:camp, refetch:refetchCamp, isLoading}=useQuery({queryKey:['campaign',id], queryFn: async()=>(await journeyApi.get(`/api/campaigns/${id}`)).data})
  const {data:journeys}=useQuery({queryKey:['journeys',id], queryFn: async()=>(await journeyApi.get(`/api/campaigns/${id}/journeys`)).data})
  const {data:activity}=useQuery({queryKey:['activity',id], queryFn: async()=>(await journeyApi.get(`/api/campaigns/${id}/activity`)).data})
  const [copied,setCopied]=useState(false)
  const [rotating,setRotating]=useState(false)
  if(!camp) return isLoading ? <div className="space-y-3"><Skeleton className="h-12 w-1/2" /><Skeleton className="h-24 w-full" /></div> : <div className="text-sm text-muted-foreground">Loading...</div>
  const devLink=camp.devToken ? devLinkFor(camp.devToken) : ''
  const productLink=`${window.location.origin}/c/${id}`
  const isPublished=(journeys||[]).some((j:any)=>j.status==='PUBLISHED')
  const copy=()=>{ if(devLink){ navigator.clipboard?.writeText(devLink); setCopied(true); toast.success('Dev link copied'); setTimeout(()=>setCopied(false),1500)} }
  const copyProduct=()=>{ navigator.clipboard?.writeText(productLink); setCopied(true); toast.success('Product link copied'); setTimeout(()=>setCopied(false),1500)}
  const rotate=async()=>{ setRotating(true); try{ await journeyApi.post(`/api/campaigns/${id}/dev-link/rotate`); refetchCamp() } finally{ setRotating(false)} }
  const isDeleted=!!camp.deletedAt
  const remove=async()=>{ if(!window.confirm(`Hide "${camp.name}" from listing? Direct links will keep working.`)) return; try{ await journeyApi.delete(`/api/campaigns/${id}`); toast.success('Campaign hidden from listing'); qc.invalidateQueries({queryKey:['campaigns']}); refetchCamp() } catch{ toast.error('Delete failed') } }
  const restore=async()=>{ try{ await journeyApi.post(`/api/campaigns/${id}/restore`); toast.success('Campaign restored'); qc.invalidateQueries({queryKey:['campaigns']}); refetchCamp() } catch{ toast.error('Restore failed') } }
  return <div>
    <p className="text-eyebrow text-muted-foreground">Campaign</p>
    <h1 className="font-display text-display-lg mt-2">{camp.name}</h1>
    <div className="mt-2 font-mono text-mono-xs text-muted-foreground">{camp.id} · {camp.status}</div>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {isDeleted && <Badge variant="destructive">Hidden from listing</Badge>}
      {isPublished && <Badge variant="default">Published</Badge>}
      {!isPublished && <Badge variant="outline">{camp.status}</Badge>}
      <span className="text-eyebrow text-muted-foreground">Dev link</span>
      {camp.devToken && <Badge variant="outline" className="font-mono">DEV · /d/{camp.devToken.slice(0,8)}</Badge>}
    </div>
    {camp.devToken && <div className="mt-4 flex flex-wrap items-center gap-2 border border-border p-3">
      <span className="flex-1 truncate font-mono text-mono-xs text-muted-foreground">{devLink}</span>
      <Button variant="outline" size="sm" onClick={copy}>{copied?'Copied':'Copy'}</Button>
      <Button variant="outline" size="sm" onClick={rotate} disabled={rotating}>{rotating?'Rotating…':'Rotate'}</Button>
    </div>}
    {isPublished && <div className="mt-2 flex flex-wrap items-center gap-2 border border-border p-3">
      <span className="flex-1 truncate font-mono text-mono-xs text-muted-foreground">LIVE · /c/{id} · {productLink}</span>
      <Button variant="outline" size="sm" onClick={copyProduct}>Copy product link</Button>
      <Button size="sm" asChild><a href={productLink} target="_blank" rel="noreferrer">Open product link</a></Button>
    </div>}
    <div className="mt-6 flex flex-wrap gap-2">
      <Button asChild><Link to={`/campaigns/${id}/setup`}>Campaign workspace</Link></Button>
      <Button variant="outline" asChild><Link to={`/campaigns/${id}/analytics`}>Analytics</Link></Button>
      {devLink && <Button variant="outline" asChild><a href={devLink} target="_blank" rel="noreferrer">Open DEV preview</a></Button>}
      {isPublished && <Button variant="outline" asChild><a href={productLink} target="_blank" rel="noreferrer">Open product link</a></Button>}
      {!isDeleted && <Button variant="outline" onClick={remove}>Hide from listing</Button>}
      {isDeleted && <Button variant="outline" onClick={restore}>Restore to listing</Button>}
    </div>
    {isDeleted && <div className="mt-4 border border-border p-3 text-sm text-muted-foreground">Hidden from campaign listing. Direct links (/c/{id}) keep working.</div>}
    <Separator className="my-8" />
    <h2 className="font-display text-display-md">Journeys</h2>
    <div className="mt-4">
      {(journeys||[]).map((j:any)=><div key={j.id}><div className="flex items-center justify-between py-4">
        <span className="text-sm"><span className="font-medium">{j.name}</span> <span className="text-muted-foreground">({j.status})</span></span>
        <Link to={`/campaigns/${id}/journey?jid=${j.id}`} className="text-sm text-foreground underline underline-offset-4 decoration-1 hover:decoration-2">Edit</Link>
      </div><Separator /></div>)}
      {(journeys||[]).length===0&&<div className="text-sm text-muted-foreground">No journeys. Create one in the canvas.</div>}
    </div>
    <h2 className="font-display text-display-md mt-10">Activity Timeline</h2>
    <div className="mt-4">
      {(activity||[]).slice(0,20).map((a:any)=><div key={a.id} className="border-l-2 border-foreground py-2 pl-4">
        <span className="font-mono text-mono-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</span>{' '}
        <span className="text-sm font-medium">{a.type}</span>{' '}
        <span className="text-sm text-muted-foreground">{a.payloadJson?.slice(0,120)}</span>
      </div>)}
      {(activity||[]).length===0&&<div className="text-sm text-muted-foreground">No activity yet. Run a simulation or trigger anomaly.</div>}
    </div>
  </div>
}
