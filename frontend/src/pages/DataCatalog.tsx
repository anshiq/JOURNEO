import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '../lib/api'
import { useState } from 'react'
export default function Catalog(){
  const [cid,setCid]=useState('campaign-a')
  const {data:defs}=useQuery({queryKey:['defs'], queryFn: async()=>(await analyticsApi.get('/catalog/metrics/definitions')).data})
  const {data:catalog}=useQuery({queryKey:['catalog',cid], queryFn: async()=>(await analyticsApi.get(`/catalog/metrics/${cid}`)).data})
  return <div>
    <h1 className="text-2xl font-bold">Data Catalog</h1>
    <div className="mt-3 flex gap-2"><input value={cid} onChange={e=>setCid(e.target.value)} className="border px-2 py-1 rounded"/><button onClick={()=>{}} className="border px-3 py-1 rounded">Load</button></div>
    <div className="bg-white border rounded p-4 mt-4">
      <h3 className="font-semibold">Metrics for {catalog?.campaign_id}</h3>
      <div className="text-xs opacity-60">{catalog?.window?.from} to {catalog?.window?.to}</div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        {(catalog?.metrics||[]).map((m:any)=><div key={m.key} className="border rounded p-3">
          <div className="font-semibold">{m.label} ({m.key})</div>
          <div className="text-xs opacity-60">{m.definition} • {m.unit} {m.formula?`• ${m.formula}`:''}</div>
          <div className="text-lg font-bold mt-1">{m.value} <span className="text-xs opacity-60">was {m.previous_value}</span> <span className="text-xs bg-slate-100 px-1 rounded">{m.platform}</span></div>
        </div>)}
      </div>
    </div>
    <div className="bg-white border rounded p-4 mt-6">
      <h3 className="font-semibold">Metric Definitions (normalized schema)</h3>
      <div className="mt-2 space-y-1 text-sm">{(defs||[]).map((d:any)=><div key={d.key} className="border p-2 rounded"><span className="font-mono font-semibold">{d.key}</span> {d.label} - {d.definition} ({d.unit}) {d.formula&&<span className="opacity-60">formula: {d.formula}</span>}</div>)}</div>
    </div>
  </div>
}
