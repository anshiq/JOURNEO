import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aiApi } from '../lib/api'
export default function Approvals(){
  const qc=useQueryClient()
  const {data}=useQuery({queryKey:['proposals'], queryFn: async()=>(await aiApi.get('/v1/optimizer/proposals')).data, refetchInterval:3000})
  const approve=useMutation({mutationFn: async(id:number)=> (await aiApi.post(`/v1/optimizer/proposals/${id}/approve`)).data, onSuccess:()=>qc.invalidateQueries({queryKey:['proposals']})})
  const reject=useMutation({mutationFn: async(id:number)=> (await aiApi.post(`/v1/optimizer/proposals/${id}/reject`)).data, onSuccess:()=>qc.invalidateQueries({queryKey:['proposals']})})
  return <div>
    <h1 className="text-2xl font-bold">Approvals (human-in-the-loop)</h1>
    <div className="mt-4 space-y-3">
      {(data||[]).map((p:any)=><div key={p.id} className="bg-white border rounded p-4">
        <div className="flex justify-between"><span className="font-semibold">#{p.id} {p.source}</span><span className={`px-2 py-1 rounded text-xs ${p.status==='pending'?'bg-amber-100':p.status==='executed'?'bg-green-100':'bg-slate-100'}`}>{p.status}</span></div>
        <div className="text-sm mt-2">Campaign: {p.campaign_id} • Confidence: {(p.confidence*100).toFixed(0)}% • Impact: {p.estimated_impact} <span className={`ml-2 px-2 py-0.5 rounded text-xs ${p.guardrail_status==='pass'?'bg-green-50':p.guardrail_status==='flag'?'bg-amber-50':'bg-red-50'}`}>Guardrail: {p.guardrail_status}</span></div>
        <div className="text-sm mt-1">Action: <code>{JSON.stringify(p.proposed_action)}</code></div>
        <div className="text-xs opacity-60 mt-1">{p.rationale}</div>
        {p.status==='pending' && <div className="flex gap-2 mt-3"><button onClick={()=>approve.mutate(p.id)} className="bg-green-600 text-white px-4 py-1 rounded">Approve & Execute</button><button onClick={()=>reject.mutate(p.id)} className="border px-4 py-1 rounded">Reject</button></div>}
      </div>)}
      {(!data||data.length===0)&&<div className="opacity-60 text-sm">No proposals yet. Run optimizer or Studio AI.</div>}
    </div>
  </div>
}
