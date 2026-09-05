import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '../lib/api'
import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
export default function Analytics(){
  const {id}=useParams()
  const campaignId=id || 'campaign-a'
  const [cid,setCid]=useState(campaignId)
  const {data:reach}=useQuery({queryKey:['reach',cid], queryFn: async()=>(await analyticsApi.get(`/api/analytics/campaigns/${cid}/reach`)).data})
  const {data:cost}=useQuery({queryKey:['cost'], queryFn: async()=>(await analyticsApi.get('/api/analytics/llm-cost')).data})
  return <div>
    <h1 className="text-2xl font-bold">Analytics</h1>
    <div className="mt-3 flex gap-2"><input value={cid} onChange={e=>setCid(e.target.value)} className="border px-2 py-1 rounded" placeholder="campaign ID" />
      <span className="text-xs opacity-60 py-2">Try campaign-a/b/c/d</span>
    </div>
    <div className="grid grid-cols-3 gap-4 mt-4">
      <div className="bg-white p-4 rounded border">Impressions<br/><span className="text-2xl font-bold">{reach?.totals?.impressions||0}</span></div>
      <div className="bg-white p-4 rounded border">CTR<br/><span className="text-2xl font-bold">{(reach?.totals?.ctr||0).toFixed(2)}%</span></div>
      <div className="bg-white p-4 rounded border">CPA<br/><span className="text-2xl font-bold">${(reach?.totals?.cpa||0).toFixed(2)}</span></div>
    </div>
    <div className="bg-white p-4 rounded border mt-6 h-80">
      <h3 className="font-semibold">Reach & Metrics (30d)</h3>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={reach?.series||[]}><XAxis dataKey="date" hide /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="ctr" stroke="#3b82f6" dot={false}/><Line type="monotone" dataKey="frequency" stroke="#f59e0b" dot={false}/><Line type="monotone" dataKey="cpa" stroke="#ef4444" dot={false}/></LineChart>
      </ResponsiveContainer>
    </div>
    <div className="bg-white p-4 rounded border mt-6">
      <h3 className="font-semibold">LLM Cost Breakdown</h3>
      <div className="text-sm mt-2">Total Cost: ${cost?.totalCostUsd?.toFixed(4)||0} • Tokens: {cost?.totalTokens||0}</div>
      <div className="h-48 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={cost? Object.entries(cost.byAgent||{}).map(([k,v])=>({agent:k, cost:v as number})):[]}><XAxis dataKey="agent"/><YAxis/><Tooltip/><Bar dataKey="cost" fill="#10b981"/></BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
}
