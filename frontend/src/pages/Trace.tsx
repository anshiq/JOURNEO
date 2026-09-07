import { useState } from 'react'
import { journeyApi } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Separator } from '../components/ui/Separator'

export default function Trace(){
  const [rid,setRid]=useState('')
  const [data,setData]=useState<any>(null)
  const fetch=async()=>{ const r=await journeyApi.get(`/api/trace/${rid}`); setData(r.data)}
  return <div>
    <p className="text-eyebrow text-muted-foreground">Observability</p>
    <h1 className="font-display text-display-xl mt-2">Trace Viewer</h1>
    <div className="rule mt-6" />
    <div className="mt-6 flex max-w-xl items-end gap-2">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="trace-id">Request ID</Label>
        <Input id="trace-id" value={rid} onChange={e=>setRid(e.target.value)} placeholder="Paste X-Request-Id" className="font-mono text-mono-xs" />
      </div>
      <Button onClick={fetch}>Fetch</Button>
    </div>
    {data && <Card className="mt-6">
      <CardHeader><CardTitle>Request trace</CardTitle></CardHeader>
      <CardContent>
        <div className="font-mono text-mono-xs text-muted-foreground">Request: {data.requestId}</div>
        <div className="mt-3">
          {(data.spans||[]).map((s:any,i:number)=><div key={i} className="border-l-2 border-foreground py-2 pl-4">
            <div className="text-sm font-medium">{s.service} <span className="font-normal text-muted-foreground">{s.method} {s.path} → {s.status} ({s.durationMs}ms)</span></div>
            <div className="font-mono text-mono-xs text-muted-foreground">{s.createdAt}</div>
            {s.factsJson && <pre className="mt-1 border border-border bg-secondary p-2 font-mono text-mono-xs text-muted-foreground">{s.factsJson.slice(0,300)}</pre>}
          </div>)}
          {(data.spans||[]).length===0&&<div className="text-sm text-muted-foreground">No spans found. Try running a simulation and copying its requestId.</div>}
        </div>
      </CardContent>
    </Card>}
    <Separator className="my-8" />
    <div className="text-xs text-muted-foreground">Each service emits one canonical JSON line per request. journey-service fans out to /internal/logs on all services and merges waterfall.</div>
  </div>
}
