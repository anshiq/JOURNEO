import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aiApi } from '../lib/api'
import { useState } from 'react'
export default function KB(){
  const qc=useQueryClient()
  const {data:sources}=useQuery({queryKey:['kb-sources'], queryFn: async()=>(await aiApi.get('/v1/knowledge/sources')).data})
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
    <h1 className="text-2xl font-bold">Knowledge Base</h1>
    <div className="grid grid-cols-2 gap-6 mt-4">
      <div className="bg-white p-4 rounded border">
        <h3 className="font-semibold">Upload PDF</h3><input type="file" accept=".pdf" onChange={onFile} className="mt-2" />
        <h3 className="font-semibold mt-6">Add Web URL</h3><div className="flex gap-2 mt-2"><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..." className="border px-2 py-1 rounded flex-1"/><button onClick={()=>addWeb.mutate()} className="bg-blue-600 text-white px-3 py-1 rounded">Add</button></div>
        <h3 className="font-semibold mt-6">Add Q&A</h3><input value={qaQ} onChange={e=>setQaQ(e.target.value)} placeholder="Question" className="border px-2 py-1 rounded w-full mt-2"/><textarea value={qaA} onChange={e=>setQaA(e.target.value)} placeholder="Answer" className="border px-2 py-1 rounded w-full mt-2 h-20"/><button onClick={()=>addQa.mutate()} className="bg-blue-600 text-white px-3 py-1 rounded mt-2">Add Q&A</button>
      </div>
      <div className="bg-white p-4 rounded border">
        <h3 className="font-semibold">Sources</h3>
        <div className="mt-2 space-y-1 text-sm">{(sources||[]).map((s:any)=><div key={s.id} className="border p-2 rounded flex justify-between"><span>[{s.type}] {s.title}</span><button onClick={async()=>{await aiApi.delete(`/v1/knowledge/sources/${s.id}`); qc.invalidateQueries({queryKey:['kb-sources']})}} className="text-red-600">Delete</button></div>)}</div>
      </div>
    </div>
    <div className="bg-white p-4 rounded border mt-6">
      <h3 className="font-semibold">Test Query (grounded)</h3>
      <div className="flex gap-2 mt-2"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ask knowledge base..." className="border px-2 py-1 rounded flex-1"/><button onClick={doQuery} className="bg-green-600 text-white px-4 py-1 rounded">Query</button></div>
      {result && <div className="mt-4 p-3 bg-slate-50 rounded text-sm">
        <div className={result.grounded? 'text-green-700':'text-red-600'}>{result.grounded ? 'Grounded ✓' : 'Not grounded ✗'} {result.reason||''}</div>
        <div className="mt-2">{result.answer}</div>
        {result.citations?.map((c:any,i:number)=><div key={i} className="text-xs opacity-60 mt-1">[{i+1}] {c.snippet} (sim {c.similarity?.toFixed(2)})</div>)}
      </div>}
    </div>
  </div>
}
