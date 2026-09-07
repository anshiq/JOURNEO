import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aiApi } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Separator } from '../components/ui/Separator'
import { Skeleton } from '../components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table'

export default function Approvals(){
  const qc=useQueryClient()
  const {data, isLoading}=useQuery({queryKey:['proposals'], queryFn: async()=>(await aiApi.get('/v1/optimizer/proposals')).data, refetchInterval:3000})
  const approve=useMutation({mutationFn: async(id:number)=> (await aiApi.post(`/v1/optimizer/proposals/${id}/approve`)).data, onSuccess:()=>qc.invalidateQueries({queryKey:['proposals']})})
  const reject=useMutation({mutationFn: async(id:number)=> (await aiApi.post(`/v1/optimizer/proposals/${id}/reject`)).data, onSuccess:()=>qc.invalidateQueries({queryKey:['proposals']})})
  return <div>
    <p className="text-eyebrow text-muted-foreground">Governance</p>
    <h1 className="font-display text-display-xl mt-2">Approvals</h1>
    <div className="rule mt-6" />
    <div className="mt-6">
      {isLoading && <div className="space-y-2">{[0,1].map(i=><Skeleton key={i} className="h-24 w-full" />)}</div>}
      {!isLoading && <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Proposal</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Campaign</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Guardrail</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data||[]).map((p:any)=><TableRow key={p.id}>
            <TableCell>
              <div className="font-medium">#{p.id} {p.source}</div>
              <div className="mt-1 font-mono text-mono-xs text-muted-foreground">{JSON.stringify(p.proposed_action)}</div>
              <div className="mt-1 text-xs text-muted-foreground">{p.rationale}</div>
              {p.status==='pending' && <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={()=>approve.mutate(p.id)}>Approve & Execute</Button>
                <Button variant="outline" size="sm" onClick={()=>reject.mutate(p.id)}>Reject</Button>
              </div>}
            </TableCell>
            <TableCell><Badge variant={p.status==='executed' ? 'default' : 'outline'}>{p.status}</Badge></TableCell>
            <TableCell className="font-mono text-mono-xs">{p.campaign_id}</TableCell>
            <TableCell>{(p.confidence*100).toFixed(0)}%</TableCell>
            <TableCell><Badge variant={p.guardrail_status==='pass' ? 'outline' : 'destructive'}>Guardrail: {p.guardrail_status}</Badge></TableCell>
            <TableCell className="text-xs text-muted-foreground">{p.estimated_impact}</TableCell>
          </TableRow>)}
        </TableBody>
      </Table>}
      {(!isLoading && (!data||data.length===0))&&<div className="mt-6 text-sm text-muted-foreground">No proposals yet. Run optimizer or Studio AI.</div>}
    </div>
    <Separator className="my-8" />
    <p className="text-body-sm text-muted-foreground">Human-in-the-loop: every risky action waits here before execution.</p>
  </div>
}
