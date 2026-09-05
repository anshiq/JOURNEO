import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aiApi } from '../lib/api'
import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Label } from '../components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Separator } from '../components/ui/Separator'
import { Skeleton } from '../components/ui/Skeleton'

export default function KB(){
  const qc=useQueryClient()
  const {data:sources, isLoading}=useQuery({queryKey:['kb-sources'], queryFn: async()=>(await aiApi.get('/v1/knowledge/sources')).data})
  const [qaQ,setQaQ]=useState(''); const [qaA,setQaA]=useState('')
  const [url,setUrl]=useState('')
  const [query,setQuery]=useState('')
  const [result,setResult]=useState<any>(null)
  const addQa=useMutation({mutationFn: async()=> (await aiApi.post('/v1/knowledge/sources/qa',{question:qaQ, answer:qaA})).data, onSuccess:()=>qc.invalidateQueries({queryKey:['kb-sources']})})
  const addWeb=useMutation({mutationFn: async()=> (await aiApi.post('/v1/knowledge/sources/web',{url})).data, onSuccess:()=>qc.invalidateQueries({queryKey:['kb-sources']})})
  const doQuery=async()=>{ const r=await aiApi.post('/v1/knowledge/query',{query, k:4}); setResult(r.data)}
  const onFile=async(e:any)=>{
    const file=e.target.files[0]; if(!file) return
    const fd=new FormData(); fd.append('file',file); fd.append('title',file.name)
    await aiApi.post('/v1/knowledge/sources/pdf',fd,{headers:{'Content-Type':'multipart/form-data'}})
    qc.invalidateQueries({queryKey:['kb-sources']})
  }
  return <div>
    <p className="text-eyebrow text-muted-foreground">Corpus</p>
    <h1 className="font-display text-display-xl mt-2">Knowledge Base</h1>
    <div className="rule mt-6" />
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Ingest</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1.5">
            <Label>Upload PDF</Label>
            <Input type="file" accept=".pdf" onChange={onFile} />
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label htmlFor="kb-url">Add Web URL</Label>
            <div className="flex gap-2"><Input id="kb-url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..." className="flex-1"/><Button onClick={()=>addWeb.mutate()}>Add</Button></div>
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label htmlFor="kb-q">Add Q&A</Label>
            <Input id="kb-q" value={qaQ} onChange={e=>setQaQ(e.target.value)} placeholder="Question" />
            <Textarea value={qaA} onChange={e=>setQaA(e.target.value)} placeholder="Answer" className="min-h-[80px]" />
            <Button onClick={()=>addQa.mutate()}>Add Q&A</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Sources</CardTitle></CardHeader>
        <CardContent>
          {isLoading && <div className="space-y-2">{[0,1,2].map(i=><Skeleton key={i} className="h-10 w-full" />)}</div>}
          {!isLoading && <div>{(sources||[]).map((s:any)=><div key={s.id}><div className="flex items-center justify-between py-3">
            <span className="text-sm">[{s.type}] {s.title}</span>
            <Button variant="destructive" size="sm" onClick={async()=>{await aiApi.delete(`/v1/knowledge/sources/${s.id}`); qc.invalidateQueries({queryKey:['kb-sources']})}}>Delete</Button>
          </div><Separator /></div>)}</div>}
        </CardContent>
      </Card>
    </div>
    <Card className="mt-6">
      <CardHeader><CardTitle>Test Query — grounded</CardTitle></CardHeader>
      <CardContent>
        <div className="flex gap-2"><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ask knowledge base..." className="flex-1"/><Button onClick={doQuery} variant="editorial">Query</Button></div>
        {result && <div className="mt-4 border border-border p-4 text-sm">
          <div className={result.grounded ? 'font-medium text-foreground' : 'font-medium text-rouge'}>{result.grounded ? 'Grounded' : 'Not grounded'} {result.reason||''}</div>
          <div className="mt-2">{result.answer}</div>
          {result.citations?.map((c:any,i:number)=><div key={i} className="mt-1 font-mono text-mono-xs text-muted-foreground">[{i+1}] {c.snippet} (sim {c.similarity?.toFixed(2)})</div>)}
        </div>}
      </CardContent>
    </Card>
  </div>
}
