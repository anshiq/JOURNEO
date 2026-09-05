import { useState } from 'react'
import { aiApi } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/Alert'

export default function StudioAI(){
  const [messages,setMessages]=useState<any[]>([{role:'user',content:'Pause campaign campaign-c on meta'}])
  const [input,setInput]=useState('Pause campaign campaign-c on meta')
  const [campaignId,setCampaignId]=useState('campaign-a')
  const [response,setResponse]=useState<any>(null)
  const [pending,setPending]=useState<any[]>([])
  const send=async()=>{
    const newMsgs=[...messages,{role:'user',content:input}]
    setMessages(newMsgs)
    const res=await aiApi.post('/v1/studio-ai/chat',{messages:newMsgs, campaign_id:campaignId})
    setResponse(res.data)
    const pend=(res.data.tool_results||[]).filter((r:any)=>r.result?.queued)
    setPending(pend)
    setMessages([...newMsgs,{role:'assistant',content:res.data.content}])
  }
  return <div>
    <p className="text-eyebrow text-muted-foreground">Copilot</p>
    <h1 className="font-display text-display-xl mt-2">Studio AI</h1>
    <div className="rule mt-6" />
    <div className="mt-6 flex max-w-md items-end gap-2">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="studio-cid">Context campaign</Label>
        <Input id="studio-cid" value={campaignId} onChange={e=>setCampaignId(e.target.value)} placeholder="campaign ID" className="font-mono text-mono-xs" />
      </div>
    </div>
    <Card className="mt-6">
      <CardHeader><CardTitle>Conversation</CardTitle></CardHeader>
      <CardContent>
        <div className="h-96 overflow-auto">
          {messages.map((m,i)=><div key={i} className={m.role==='user'?'text-right':''}>
            <span className={m.role==='user'?'inline-block bg-foreground px-3 py-1.5 text-sm text-background':'inline-block border border-border bg-background px-3 py-1.5 text-sm'} style={{margin:'4px'}}>{m.content}</span>
          </div>)}
          {response && <div className="mt-4 border border-border p-3 font-mono text-mono-xs text-muted-foreground"><pre>{JSON.stringify(response,null,2).slice(0,800)}</pre></div>}
        </div>
      </CardContent>
    </Card>
    <div className="mt-3 flex gap-2">
      <Input value={input} onChange={e=>setInput(e.target.value)} placeholder="Natural language instruction..." className="flex-1" aria-label="Instruction" />
      <Button onClick={send}>Send</Button>
    </div>
    {pending.length>0 && <Alert variant="destructive" className="mt-4">
      <AlertTitle>Pending Confirmations</AlertTitle>
      <AlertDescription>
        {pending.map((p,i)=><div key={i} className="mt-2 text-sm">Tool {p.tool} queued proposal {p.result.proposal_id} — <a href="/approvals" className="underline underline-offset-4">Go to Approvals</a></div>)}
      </AlertDescription>
    </Alert>}
  </div>
}
