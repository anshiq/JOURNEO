import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { journeyApi } from '../lib/api'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { devLinkFor } from '../lib/devLink'
import { bus } from '../lib/eventBus'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Separator } from '../components/ui/Separator'
import { Skeleton } from '../components/ui/Skeleton'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/Alert'
import { toast } from 'sonner'

export default function Campaigns(){
  const navigate=useNavigate()
  const qc=useQueryClient()
  const [showDeleted,setShowDeleted]=useState(false)
  const {data, isLoading}=useQuery({queryKey:['campaigns',showDeleted], queryFn: async()=> (await journeyApi.get(`/api/campaigns?includeDeleted=${showDeleted}`)).data})
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
  const copy=()=>{ if(createdDevLink){ navigator.clipboard?.writeText(createdDevLink); setCopied(true); toast.success('Dev link copied'); setTimeout(()=>setCopied(false),1500)} }
  const delMut=useMutation({mutationFn: async(id:string)=> (await journeyApi.delete(`/api/campaigns/${id}`)).data, onSuccess:()=>{ qc.invalidateQueries({queryKey:['campaigns']}); toast.success('Campaign hidden from listing') }, onError:()=>toast.error('Delete failed')})
  const restoreMut=useMutation({mutationFn: async(id:string)=> (await journeyApi.post(`/api/campaigns/${id}/restore`)).data, onSuccess:()=>{ qc.invalidateQueries({queryKey:['campaigns']}); toast.success('Campaign restored') }, onError:()=>toast.error('Restore failed')})
  const remove=(c:any)=>{ if(!window.confirm(`Hide "${c.name}" from listing? Direct links will keep working.`)) return; delMut.mutate(c.id) }
  return <div>
    <p className="text-eyebrow text-muted-foreground">Index</p>
    <h1 className="font-display text-display-xl mt-2">Campaigns</h1>
    <div className="rule mt-6" />
    <div className="mt-6 flex gap-2">
      <Input value={name} onChange={e=>setName(e.target.value)} placeholder="New campaign name" className="flex-1" aria-label="New campaign name" />
      <Button disabled={!name.trim() || mut.isPending} onClick={()=>mut.mutate()}>{mut.isPending?'Creating…':'Create campaign'}</Button>
      <Button variant="outline" onClick={()=>setShowDeleted(v=>!v)}>{showDeleted?'Hide hidden':'Show hidden'}</Button>
    </div>
    {createdDevLink && <Alert className="mt-4">
      <AlertTitle>Dev link ready</AlertTitle>
      <AlertDescription>
        <span className="font-mono text-mono-xs">DEV {createdDevLink}</span>
        <span className="mt-2 flex gap-2">
          <Button variant="outline" size="sm" onClick={copy}>{copied?'Copied':'Copy'}</Button>
          <Button variant="link" size="sm" asChild><a href={createdDevLink} target="_blank" rel="noreferrer">Open</a></Button>
        </span>
      </AlertDescription>
    </Alert>}
    <div className="mt-8">
      {isLoading && <div className="space-y-3">{[0,1,2].map(i=><Skeleton key={i} className="h-20 w-full" />)}</div>}
      {!isLoading && (data||[]).map((c:any)=><div key={c.id}>
        <div className="group flex items-baseline justify-between gap-6 py-6">
        <Link to={`/campaigns/${c.id}`} className="flex min-w-0 flex-1 items-baseline justify-between gap-6">
          <div className="min-w-0">
            <div className="font-display text-display-md truncate group-hover:underline group-hover:underline-offset-4">{c.name}</div>
            <div className="mt-1 font-mono text-mono-xs text-muted-foreground">{c.id}</div>
            {c.devToken && <div className="mt-1 font-mono text-mono-xs text-muted-foreground">DEV /d/{c.devToken.slice(0,8)}</div>}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {c.deletedAt && <Badge variant="destructive">Hidden</Badge>}
            <Badge variant="outline">{c.status}</Badge>
            <span className="text-eyebrow text-muted-foreground">Journey</span>
            <span className="text-eyebrow text-muted-foreground">Analytics</span>
          </div>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {!c.deletedAt && <Button variant="outline" size="sm" disabled={delMut.isPending} onClick={()=>remove(c)}>Hide</Button>}
          {c.deletedAt && <>
            <Button variant="outline" size="sm" asChild><Link to={`/c/${c.id}`} target="_blank" rel="noreferrer">Open</Link></Button>
            <Button variant="outline" size="sm" disabled={restoreMut.isPending} onClick={()=>restoreMut.mutate(c.id)}>Restore</Button>
          </>}
        </div>
        </div>
        <Separator />
      </div>)}
    </div>
    {(!isLoading && (!data||data.length===0))&&<div className="mt-8 text-center text-sm text-muted-foreground">No campaigns yet. Create one, or run docker-compose with seeded data.</div>}
  </div>
}
