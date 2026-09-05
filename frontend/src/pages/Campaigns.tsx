import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { journeyApi } from '../lib/api'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { devLinkFor } from '../lib/devLink'
import { bus } from '../lib/eventBus'
export default function Campaigns(){
  const navigate=useNavigate()
  const qc=useQueryClient()
  const {data}=useQuery({queryKey:['campaigns'], queryFn: async()=> (await journeyApi.get('/api/campaigns')).data})
  const [name,setName]=useState('')
  const [createdDevLink,setCreatedDevLink]=useState<string|null>(null)
  const [copied,setCopied]=useState(false)
  const mut=useMutation({mutationFn: async()=> (await journeyApi.post('/api/campaigns',{name, description:''})).data, onSuccess:(campaign)=>{
    qc.invalidateQueries({queryKey:['campaigns']}); setName('');
    const link=campaign.devLink ? `${window.location.origin}${campaign.devLink}` : devLinkFor(campaign.devToken)
    setCreatedDevLink(link)
    bus.emit('campaign:created', { campaignId:campaign.id, devToken:campaign.devToken, devLink:link })
    navigate(`/campaigns/${campaign.id}/setup`)
  }})
  const copy=()=>{ if(createdDevLink){ navigator.clipboard?.writeText(createdDevLink); setCopied(true); setTimeout(()=>setCopied(false),1500)} }
  return <div>
    <h1 className="text-2xl font-bold">Campaigns</h1>
    <div className="mt-4 flex gap-2"><input value={name} onChange={e=>setName(e.target.value)} placeholder="New campaign name" className="border px-3 py-2 rounded flex-1" /><button disabled={!name.trim() || mut.isPending} onClick={()=>mut.mutate()} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">{mut.isPending?'Creating…':'Create campaign'}</button></div>
    {createdDevLink && <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs"><span className="font-mono">DEV {createdDevLink}</span><button onClick={copy} className="rounded bg-white px-2 py-1 border text-xs">{copied?'Copied':'Copy'}</button><a href={createdDevLink} target="_blank" rel="noreferrer" className="text-blue-600 underline">Open</a></div>}
    <div className="grid grid-cols-3 gap-4 mt-6">
      {(data||[]).map((c:any)=><Link key={c.id} to={`/campaigns/${c.id}`} className="border rounded p-4 bg-white hover:shadow">
        <div className="font-semibold">{c.name}</div><div className="text-sm opacity-60">{c.id}</div><div className="text-xs mt-2">Status: {c.status}</div>
        {c.devToken && <div className="mt-1 text-[10px] font-mono opacity-50">DEV /d/{c.devToken.slice(0,8)}</div>}
        <div className="mt-3 flex gap-2 text-xs"><span className="bg-blue-50 px-2 py-1 rounded">Journey</span><span className="bg-green-50 px-2 py-1 rounded">Analytics</span></div>
      </Link>)}
    </div>
    {(!data||data.length===0)&&<div className="mt-8 text-center opacity-60">No campaigns yet. Create one, or run docker-compose with seeded data.</div>}
  </div>
}
