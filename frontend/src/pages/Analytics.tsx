import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '../lib/api'
import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Separator } from '../components/ui/Separator'
import { Skeleton } from '../components/ui/Skeleton'
import { chartTheme } from '../lib/chartTheme'

export default function Analytics(){
  const {id}=useParams()
  const campaignId=id || 'campaign-a'
  const [cid,setCid]=useState(campaignId)
  const {data:reach, isLoading:reachLoading}=useQuery({queryKey:['reach',cid], queryFn: async()=>(await analyticsApi.get(`/api/analytics/campaigns/${cid}/reach`)).data})
  const {data:cost}=useQuery({queryKey:['cost'], queryFn: async()=>(await analyticsApi.get('/api/analytics/llm-cost')).data})
  const axisStyle = { fontFamily: chartTheme.font, fontSize: chartTheme.fontSize, fill: chartTheme.axis }
  return <div>
    <p className="text-eyebrow text-muted-foreground">Measurement</p>
    <h1 className="font-display text-display-xl mt-2">Analytics</h1>
    <div className="rule mt-6" />
    <div className="mt-6 flex items-center gap-3">
      <Input value={cid} onChange={e=>setCid(e.target.value)} placeholder="campaign ID" className="max-w-xs" aria-label="campaign ID" />
      <span className="text-xs text-muted-foreground">Try campaign-a/b/c/d</span>
    </div>
    <div className="mt-6 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3">
      {reachLoading ? [0,1,2].map(i=><div key={i} className="bg-background p-6"><Skeleton className="h-8 w-24" /></div>) : <>
        <div className="bg-background p-6"><p className="text-eyebrow text-muted-foreground">Impressions</p><p className="font-display text-display-lg mt-2">{reach?.totals?.impressions||0}</p></div>
        <div className="bg-background p-6"><p className="text-eyebrow text-muted-foreground">CTR</p><p className="font-display text-display-lg mt-2">{(reach?.totals?.ctr||0).toFixed(2)}%</p></div>
        <div className="bg-background p-6"><p className="text-eyebrow text-muted-foreground">CPA</p><p className="font-display text-display-lg mt-2">${(reach?.totals?.cpa||0).toFixed(2)}</p></div>
      </>}
    </div>
    <Card className="mt-6">
      <CardHeader><CardTitle>Reach & Metrics — 30 days</CardTitle></CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={reach?.series||[]}>
              <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
              <XAxis dataKey="date" hide tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="ctr" stroke={chartTheme.series[0]} strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="frequency" stroke={chartTheme.series[1]} strokeWidth={2} strokeDasharray="6 3" dot={false}/>
              <Line type="monotone" dataKey="cpa" stroke={chartTheme.series[3]} strokeWidth={2} strokeDasharray="2 3" dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <Separator className="my-4" />
        <p className="text-body-sm text-muted-foreground">Series distinguished by line style as well as tone.</p>
      </CardContent>
    </Card>
    <Card className="mt-6">
      <CardHeader><CardTitle>LLM Cost Breakdown</CardTitle></CardHeader>
      <CardContent>
        <div className="text-sm">Total Cost: <span className="font-mono text-mono-xs">${cost?.totalCostUsd?.toFixed(4)||0}</span> · Tokens: <span className="font-mono text-mono-xs">{cost?.totalTokens||0}</span></div>
        <div className="mt-2 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cost? Object.entries(cost.byAgent||{}).map(([k,v])=>({agent:k, cost:v as number})):[]}>
              <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
              <XAxis dataKey="agent" tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip />
              <Bar dataKey="cost" fill={chartTheme.series[0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  </div>
}
