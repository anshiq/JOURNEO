import { useState } from 'react'
import { aiApi } from '../lib/api'
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
    // show pending confirmations
    const pend=(res.data.tool_results||[]).filter((r:any)=>r.result?.queued)
    setPending(pend)
    setMessages([...newMsgs,{role:'assistant',content:res.data.content}])
  }
  return <div>
    <h1 className="text-2xl font-bold">Studio AI (tool-calling)</h1>
    <div className="mt-4 flex gap-2"><input value={campaignId} onChange={e=>setCampaignId(e.target.value)} placeholder="campaign ID" className="border px-2 py-1 rounded"/><span className="text-xs opacity-60 py-2">Context campaign</span></div>
    <div className="bg-white border rounded p-4 mt-4 h-96 overflow-auto">
      {messages.map((m,i)=><div key={i} className={m.role==='user'?'text-right':''}><span className={m.role==='user'?'bg-blue-600 text-white':'bg-slate-100'} style={{display:'inline-block', padding:'6px 10px', borderRadius:12, margin:'4px'}}>{m.content}</span></div>)}
      {response && <div className="text-xs mt-4 p-2 bg-slate-50 rounded"><pre>{JSON.stringify(response,null,2).slice(0,800)}</pre></div>}
    </div>
    <div className="flex gap-2 mt-3"><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Natural language instruction..." className="border px-3 py-2 rounded flex-1"/><button onClick={send} className="bg-blue-600 text-white px-6 py-2 rounded">Send</button></div>
    {pending.length>0 && <div className="mt-4 bg-amber-50 border border-amber-200 p-3 rounded">
      <h3 className="font-semibold">Pending Confirmations (risky actions)</h3>
      {pending.map((p,i)=><div key={i} className="text-sm mt-2">Tool {p.tool} queued proposal {p.result.proposal_id} - <a href="/approvals" className="text-blue-600">Go to Approvals</a></div>)}
    </div>}
  </div>
}
