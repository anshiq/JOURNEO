import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aiApi } from '../lib/api'
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'
import { Button } from '../components/ui/Button'
import { Label } from '../components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Separator } from '../components/ui/Separator'
import { chartTheme } from '../lib/chartTheme'

export default function Eval(){
  const qc=useQueryClient()
  const [version,setVersion]=useState('v1')
  const {data:runs}=useQuery({queryKey:['eval-runs'], queryFn: async()=>(await aiApi.get('/v1/eval/runs')).data})
  const run=useMutation({mutationFn: async()=> (await aiApi.post('/v1/eval/runs',{prompt_version: version})).data, onSuccess:()=>qc.invalidateQueries({queryKey:['eval-runs']})})
  const chartData=runs? Object.values(runs.reduce((acc:any,r:any)=>{ if(!acc[r.prompt_version]) acc[r.prompt_version]={version:r.prompt_version, relevance:0, calibration:0, count:0}; acc[r.prompt_version].relevance+=r.relevance_score; acc[r.prompt_version].calibration+=r.calibration_score; acc[r.prompt_version].count+=1; return acc},{})).map((v:any)=>({...v, relevance: v.relevance/v.count, calibration: v.calibration/v.count})): []
  const axisStyle = { fontFamily: chartTheme.font, fontSize: chartTheme.fontSize, fill: chartTheme.axis }
  return <div>
    <p className="text-eyebrow text-muted-foreground">Quality</p>
    <h1 className="font-display text-display-xl mt-2">Eval Harness</h1>
    <div className="rule mt-6" />
    <div className="mt-6 flex max-w-md items-end gap-2">
      <div className="flex-1 space-y-1.5">
        <Label>Prompt version</Label>
        <Select value={version} onValueChange={setVersion}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="v1">v1</SelectItem><SelectItem value="v2">v2</SelectItem></SelectContent>
        </Select>
      </div>
      <Button onClick={()=>run.mutate()}>Run Eval</Button>
    </div>
    <Card className="mt-6">
      <CardHeader><CardTitle>Relevance / Calibration by prompt version</CardTitle></CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
              <XAxis dataKey="version" tick={axisStyle} />
              <YAxis domain={[0,1]} tick={axisStyle} />
              <Tooltip />
              <Legend />
              <Bar dataKey="relevance" fill={chartTheme.series[0]} />
              <Bar dataKey="calibration" fill={chartTheme.series[1]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
    <Card className="mt-6">
      <CardHeader><CardTitle>Per-scenario</CardTitle></CardHeader>
      <CardContent>
        <div>{(runs||[]).slice(0,20).map((r:any)=><div key={r.id}><div className="py-3">
          <span className="font-mono text-mono-xs">{r.scenario_id}</span> <span className="text-sm">v={r.prompt_version} rel={r.relevance_score?.toFixed(2)} cal={r.calibration_score?.toFixed(2)}</span>
          <pre className="mt-1 border border-border bg-secondary p-2 font-mono text-mono-xs text-muted-foreground">{JSON.stringify(r.agent_output,null,2).slice(0,300)}</pre>
          <div className="mt-1 text-xs text-muted-foreground">Baseline: {JSON.stringify(r.human_baseline).slice(0,200)}</div>
        </div><Separator /></div>)}</div>
      </CardContent>
    </Card>
  </div>
}
