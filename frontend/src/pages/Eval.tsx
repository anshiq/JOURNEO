import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aiApi } from '../lib/api'
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
export default function Eval(){
  const qc=useQueryClient()
  const [version,setVersion]=useState('v1')
  const {data:runs}=useQuery({queryKey:['eval-runs'], queryFn: async()=>(await aiApi.get('/v1/eval/runs')).data})
  const run=useMutation({mutationFn: async()=> (await aiApi.post('/v1/eval/runs',{prompt_version: version})).data, onSuccess:()=>qc.invalidateQueries({queryKey:['eval-runs']})})
  const chartData=runs? Object.values(runs.reduce((acc:any,r:any)=>{ if(!acc[r.prompt_version]) acc[r.prompt_version]={version:r.prompt_version, relevance:0, calibration:0, count:0}; acc[r.prompt_version].relevance+=r.relevance_score; acc[r.prompt_version].calibration+=r.calibration_score; acc[r.prompt_version].count+=1; return acc},{})).map((v:any)=>({...v, relevance: v.relevance/v.count, calibration: v.calibration/v.count})): []
  return <div>
    <h1 className="text-2xl font-bold">Eval Harness</h1>
    <div className="flex gap-2 mt-4"><select value={version} onChange={e=>setVersion(e.target.value)} className="border px-2 py-1 rounded"><option value="v1">v1</option><option value="v2">v2</option></select><button onClick={()=>run.mutate()} className="bg-blue-600 text-white px-4 py-1 rounded">Run Eval</button></div>
    <div className="bg-white border rounded p-4 mt-6 h-64">
      <h3 className="font-semibold">Relevance / Calibration by prompt version</h3>
      <ResponsiveContainer width="100%" height="90%"><BarChart data={chartData}><XAxis dataKey="version"/><YAxis domain={[0,1]}/><Tooltip/><Legend/><Bar dataKey="relevance" fill="#3b82f6"/><Bar dataKey="calibration" fill="#10b981"/></BarChart></ResponsiveContainer>
    </div>
    <div className="bg-white border rounded p-4 mt-6">
      <h3 className="font-semibold">Per-scenario</h3>
      <div className="mt-2 space-y-2 text-sm">{(runs||[]).slice(0,20).map((r:any)=><div key={r.id} className="border p-2 rounded"><span className="font-mono">{r.scenario_id}</span> v={r.prompt_version} rel={r.relevance_score?.toFixed(2)} cal={r.calibration_score?.toFixed(2)}<pre className="text-xs bg-slate-50 p-1 mt-1">{JSON.stringify(r.agent_output,null,2).slice(0,300)}</pre><div className="text-xs opacity-60">Baseline: {JSON.stringify(r.human_baseline).slice(0,200)}</div></div>)}</div>
    </div>
  </div>
}
