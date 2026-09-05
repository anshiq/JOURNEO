import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '../lib/api'
import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Separator } from '../components/ui/Separator'
import { Skeleton } from '../components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table'

export default function Catalog(){
  const [cid,setCid]=useState('campaign-a')
  const {data:defs}=useQuery({queryKey:['defs'], queryFn: async()=>(await analyticsApi.get('/catalog/metrics/definitions')).data})
  const {data:catalog, isLoading}=useQuery({queryKey:['catalog',cid], queryFn: async()=>(await analyticsApi.get(`/catalog/metrics/${cid}`)).data})
  return <div>
    <p className="text-eyebrow text-muted-foreground">Schema</p>
    <h1 className="font-display text-display-xl mt-2">Data Catalog</h1>
    <div className="rule mt-6" />
    <div className="mt-6 flex max-w-md items-end gap-2">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="catalog-cid">Campaign</Label>
        <Input id="catalog-cid" value={cid} onChange={e=>setCid(e.target.value)} className="font-mono text-mono-xs" />
      </div>
      <Button variant="outline" onClick={()=>{}}>Load</Button>
    </div>
    <Card className="mt-6">
      <CardHeader><CardTitle>Metrics for {catalog?.campaign_id}</CardTitle></CardHeader>
      <CardContent>
        <div className="font-mono text-mono-xs text-muted-foreground">{catalog?.window?.from} to {catalog?.window?.to}</div>
        {isLoading && <div className="mt-3 space-y-2">{[0,1,2].map(i=><Skeleton key={i} className="h-16 w-full" />)}</div>}
        {!isLoading && <div className="mt-3 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2">
          {(catalog?.metrics||[]).map((m:any)=><div key={m.key} className="bg-background p-4">
            <div className="text-sm font-medium">{m.label} <span className="font-mono text-mono-xs text-muted-foreground">({m.key})</span></div>
            <div className="mt-1 text-xs text-muted-foreground">{m.definition} · {m.unit} {m.formula?`· ${m.formula}`:''}</div>
            <div className="font-display text-display-md mt-2">{m.value} <span className="font-sans text-xs text-muted-foreground">was {m.previous_value}</span> <span className="font-mono text-mono-xs text-muted-foreground">{m.platform}</span></div>
          </div>)}
        </div>}
      </CardContent>
    </Card>
    <Card className="mt-6">
      <CardHeader><CardTitle>Metric Definitions — normalized schema</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Definition</TableHead>
              <TableHead>Unit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(defs||[]).map((d:any)=><TableRow key={d.key}>
              <TableCell className="font-mono text-mono-xs font-medium">{d.key}</TableCell>
              <TableCell>{d.label}</TableCell>
              <TableCell className="text-muted-foreground">{d.definition} {d.formula&&<span className="font-mono text-mono-xs">formula: {d.formula}</span>}</TableCell>
              <TableCell className="font-mono text-mono-xs">{d.unit}</TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
        <Separator className="my-4" />
      </CardContent>
    </Card>
  </div>
}
