import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { journeyApi } from '../lib/api'
import { devLinkFor } from '../lib/devLink'
export default function CampaignDetail(){
  const {id}=useParams()
  const {data:camp, refetch:refetchCamp}=useQuery({queryKey:['campaign',id], queryFn: async()=>(await journeyApi.get(`/api/campaigns/${id}`)).data})
  const {data:journeys}=useQuery({queryKey:['journeys',id], queryFn: async()=>(await journeyApi.get(`/api/campaigns/${id}/journeys`)).data})
  const {data:activity}=useQuery({queryKey:['activity',id], queryFn: async()=>(await journeyApi.get(`/api/campaigns/${id}/activity`)).data})
  const [copied,setCopied]=useState(false)
  const [rotating,setRotating]=useState(false)
  if(!camp) return <div>Loading...</div>
  const devLink=camp.devToken ? devLinkFor(camp.devToken) : ''
  const productLink=`${window.location.origin}/c/${id}`
  const isPublished=(journeys||[]).some((j:any)=>j.status==='PUBLISHED')
  const copy=()=>{ if(devLink){ navigator.clipboard?.writeText(devLink); setCopied(true); setTimeout(()=>setCopied(false),1500)} }
  const copyProduct=()=>{ navigator.clipboard?.writeText(productLink); setCopied(true); setTimeout(()=>setCopied(false),1500)}
  const rotate=async()=>{ setRotating(true); try{ await journeyApi.post(`/api/campaigns/${id}/dev-link/rotate`); refetchCamp() } finally{ setRotating(false)} }
  return <div>
    <h1 className="text-2xl font-bold">{camp.name}</h1><div className="opacity-60 text-sm">{camp.id} • {camp.status} {isPublished && <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs">PUBLISHED</span>}</div>
    {camp.devToken && <div className="mt-2 flex items-center gap-2 text-xs"><span className="rounded bg-amber-100 px-2 py-1 font-mono">DEV · /d/{camp.devToken.slice(0,8)} · {devLink}</span><button onClick={copy} className="border px-2 py-1 rounded bg-white">{copied?'Copied':'Copy'}</button><button onClick={rotate} disabled={rotating} className="border px-2 py-1 rounded bg-white disabled:opacity-50">{rotating?'Rotating…':'Rotate'}</button></div>}
    {isPublished && <div className="mt-2 flex items-center gap-2 text-xs"><span className="rounded bg-emerald-100 px-2 py-1 font-mono">LIVE · /c/{id} · {productLink}</span><button onClick={copyProduct} className="border px-2 py-1 rounded bg-white">Copy product link</button><a href={productLink} target="_blank" rel="noreferrer" className="border px-2 py-1 rounded bg-emerald-600 text-white">Open product link</a></div>}
    <div className="flex gap-4 mt-4">
      <Link to={`/campaigns/${id}/setup`} className="bg-slate-900 text-white px-4 py-2 rounded">Campaign workspace</Link>
      <Link to={`/campaigns/${id}/analytics`} className="border px-4 py-2 rounded">Analytics</Link>
      {devLink && <a href={devLink} target="_blank" rel="noreferrer" className="border px-4 py-2 rounded bg-amber-50">Open DEV preview</a>}
      {isPublished && <a href={productLink} target="_blank" rel="noreferrer" className="border px-4 py-2 rounded bg-emerald-50">Open product link</a>}
    </div>
    <h2 className="font-semibold mt-8">Journeys</h2>
    <div className="mt-2 space-y-2">
      {(journeys||[]).map((j:any)=><div key={j.id} className="border p-3 rounded bg-white flex justify-between"><span>{j.name} ({j.status})</span><Link to={`/campaigns/${id}/journey?jid=${j.id}`} className="text-blue-600">Edit</Link></div>)}
      {(journeys||[]).length===0&&<div className="opacity-60 text-sm">No journeys. Create one in the canvas.</div>}
    </div>
    <h2 className="font-semibold mt-8">Activity Timeline</h2>
    <div className="mt-2 space-y-1">
      {(activity||[]).slice(0,20).map((a:any)=><div key={a.id} className="text-sm border-l-2 pl-3 py-1"><span className="font-mono text-xs">{new Date(a.createdAt).toLocaleString()}</span> <span className="font-semibold">{a.type}</span> <span className="opacity-60">{a.payloadJson?.slice(0,120)}</span></div>)}
      {(activity||[]).length===0&&<div className="opacity-60 text-sm">No activity yet. Run a simulation or trigger anomaly.</div>}
    </div>
  </div>
}
