import { useState } from 'react'
import { journeyApi } from '../lib/api'
export default function Trace(){
  const [rid,setRid]=useState('')
  const [data,setData]=useState<any>(null)
  const fetch=async()=>{ const r=await journeyApi.get(`/api/trace/${rid}`); setData(r.data)}
  return <div>
    <h1 className="text-2xl font-bold">Trace Viewer (R10)</h1>
    <div className="flex gap-2 mt-4"><input value={rid} onChange={e=>setRid(e.target.value)} placeholder="Paste X-Request-Id" className="border px-3 py-2 rounded flex-1"/><button onClick={fetch} className="bg-blue-600 text-white px-4 py-2 rounded">Fetch</button></div>
    {data && <div className="bg-white border rounded p-4 mt-6">
      <div className="font-mono text-xs">Request: {data.requestId}</div>
      <div className="mt-3 space-y-2">
        {(data.spans||[]).map((s:any,i:number)=><div key={i} className="border-l-4 pl-3 py-1" style={{borderColor: s.service==='journey-service'?'#3b82f6': s.service==='ai-service'?'#10b981': s.service==='analytics-service'?'#f59e0b':'#ef4444'}}>
          <div className="text-sm font-semibold">{s.service} <span className="font-normal opacity-60">{s.method} {s.path} → {s.status} ({s.durationMs}ms)</span></div>
          <div className="text-xs opacity-60">{s.createdAt}</div>
          {s.factsJson && <pre className="text-xs bg-slate-50 p-1 mt-1">{s.factsJson.slice(0,300)}</pre>}
        </div>)}
        {(data.spans||[]).length===0&&<div className="text-sm opacity-60">No spans found. Try running a simulation and copying its requestId.</div>}
      </div>
    </div>}
    <div className="mt-6 text-xs opacity-60">Each service emits one canonical JSON line per request (Stripe style). journey-service fans out to /internal/logs on all services and merges waterfall.</div>
  </div>
}
