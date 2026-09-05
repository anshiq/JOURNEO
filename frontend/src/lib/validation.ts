import { z } from 'zod'
import { allNodeTypes, branchCapableNodeTypes } from '../nodes/_core/registry'
import { validateNodeConfig } from '../nodes/_core/helpers'
import type { NodeType } from '../nodes/_core/types'

export const nodeSchema=z.object({id:z.string(), type:z.enum(allNodeTypes as [string, ...string[]]), config:z.any().optional(), position:z.any().optional()})

export function validateGraph(nodes:any[], edges:any[]){
  const errs:any[]=[]
  const triggers=nodes.filter(n=>n.type==='trigger')
  if(triggers.length!==1) errs.push({nodeId:'graph', field:'trigger', message:`Exactly one trigger required, found ${triggers.length}`})
  // orphan check BFS
  if(triggers.length===1){
    const adj=new Map<string,string[]>()
    edges.forEach(e=>{if(!adj.has(e.source)) adj.set(e.source,[]); adj.get(e.source)!.push(e.target)})
    const visited=new Set<string>([triggers[0].id])
    const q=[triggers[0].id]
    while(q.length){ const cur=q.shift()!; (adj.get(cur)||[]).forEach(t=>{if(!visited.has(t)){visited.add(t); q.push(t)}})}
    nodes.forEach(n=>{if(!visited.has(n.id)) errs.push({nodeId:n.id, field:'graph', message:'Unreachable node'})})
  }
  // typed config validation, one schema per node type (see nodeSchemas.ts)
  nodes.forEach(n=>{
    const res=validateNodeConfig(n.type, n.config)
    if(!res.success) res.errors.forEach((msg: string)=>errs.push({nodeId:n.id, field:'config', message:msg}))
  })
  // branch-capable nodes must route via labeled edges
  nodes.forEach(n=>{
    if(!(branchCapableNodeTypes as string[]).includes(n.type as string)) return
    const out=edges.filter((e:any)=>e.source===n.id)
    const hasDefault=out.some((e:any)=>e.label==='default'||e.sourceHandle==='default'||(e.sourceHandle||'').includes('default'))
    if(out.length>0 && !hasDefault && out.length<2) errs.push({nodeId:n.id, field:'edges', message:`${n.type} should route via labeled outgoing edges, not a single implicit edge`})
  })
  edges.forEach(e=>{ if(!nodes.find(n=>n.id===e.source) || !nodes.find(n=>n.id===e.target)) errs.push({nodeId:e.id, field:'edges', message:'Edge references missing node'})})
  return errs
}
