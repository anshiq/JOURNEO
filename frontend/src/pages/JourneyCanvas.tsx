import { useCallback, useState, useEffect, useRef, useMemo, type DragEvent } from 'react'
import ReactFlow, { Background, Controls, useNodesState, useEdgesState, addEdge, Connection, Edge, Node, type ReactFlowInstance } from 'reactflow'
import 'reactflow/dist/style.css'
import { useParams, useSearchParams } from 'react-router-dom'
import { journeyApi, JOURNEY_URL } from '../lib/api'
import { validateGraph } from '../lib/validation'
import { allNodeTypes, defaultConfigFor } from '../nodes/_core/registry'
import type { NodeType } from '../nodes/_core/types'
import JourneyNodeRenderer from '../components/nodes/JourneyNodeRenderer'
import DevicePreviewPanel from '../components/preview/DevicePreviewPanel'
import { JourneyConfigRouter } from '../nodes/_core/ConfigRouter'
import { bus, useEvent } from '../lib/eventBus'

const nodeTypesList=allNodeTypes
const reactFlowNodeTypes={ journeyNode: JourneyNodeRenderer }

export const NODE_DRAG_MIME = 'application/x-journey-node-type'

export default function JourneyCanvas(){
  const {id} = useParams()
  const [search]=useSearchParams()
  const presetJid=search.get('jid')
  const [nodes,setNodes,onNodesChange]=useNodesState([])
  const [edges,setEdges,onEdgesChange]=useEdgesState([])
  const [selected,setSelected]=useState<any>(null)
  const [selectedEdgeId,setSelectedEdgeId]=useState<string|null>(null)
  const [paletteSearch,setPaletteSearch]=useState('')
  const [validation,setValidation]=useState<any[]>([])
  const [jid,setJid]=useState<string|null>(presetJid)
  const [running,setRunning]=useState(false)
  const [sessionLogs,setSessionLogs]=useState<any[]>([])
  const [wsConnected,setWsConnected]=useState(false)
  const [sidePanel,setSidePanel]=useState<'config'|'device'>('config')
  const rfInstance=useRef<ReactFlowInstance|null>(null)

  const onConnect=useCallback((params:Connection)=> setEdges(eds=> addEdge({...params, id:`e-${Date.now()}`}, eds)),[setEdges])

  const highlightedIdRef=useRef<string|null>(null)
  const [highlightedId, setHighlightedId]=useState<string|null>(null)
  const flashNode=useCallback((nodeId:string)=>{ setHighlightedId(nodeId); if(highlightedIdRef.current) window.clearTimeout(Number(highlightedIdRef.current)); highlightedIdRef.current=String(window.setTimeout(()=>setHighlightedId(null),500) as any) },[])
  useEvent('node:select', useCallback((p:any)=>{
    if(!p.nodeId){ setSelected(null); return }
    const found=nodes.find(n=>n.id===p.nodeId)
    if(found){ setSelected(found); setSelectedEdgeId(null); flashNode(p.nodeId) }
  },[nodes,flashNode]))
  useEffect(()=>{
    const h=(p:any)=>{ if(id) journeyApi.post(`/api/campaigns/${id}/track`, { nodeId:p.nodeId, type:p.type, handle:p.handle, viewportId:p.viewportId }).catch(()=>{}) }
    bus.on('node:track', h as any)
    return ()=>{ bus.off('node:track', h as any) }
  },[id])

  const addNode=(type:NodeType, position?:{x:number;y:number})=>{
    const nid=`n-${Date.now()}`
    const cfg=defaultConfigFor(type)
    const pos=position || {x:120+Math.random()*360,y:120+Math.random()*260}
    const newNode:Node={id:nid, type:'journeyNode', position:pos, data:{label:`${type} ${nid.slice(0,4)}`, type, config:cfg}}
    setNodes(nds=>[...nds, newNode])
    bus.emit('node:track', { nodeId:nid, type, viewportId:'iphone14' as any })
    bus.emit('node:select', { nodeId:nid, source:'canvas' })
    return nid
  }

  const onNodeClick=(_:any, node:Node)=> { setSelected(node); setSelectedEdgeId(null); flashNode(node.id); bus.emit('node:select', { nodeId:node.id, source:'canvas' }) }
  const onEdgeClick=(_:any, edge:Edge)=> { setSelectedEdgeId(edge.id); setSelected(null) }
  const onPaneClick=()=> setSelectedEdgeId(null)

  const deleteEdge=(edgeId:string)=>{
    setEdges(eds=> eds.filter(e=> e.id!==edgeId))
    setSelectedEdgeId(prev=> prev===edgeId? null : prev)
  }

  const handleEdgesChange=useCallback((changes:any[])=>{
    onEdgesChange(changes)
    changes.forEach(c=>{ if(c.type==='remove') setSelectedEdgeId(prev=> prev===c.id? null : prev) })
  },[onEdgesChange])

  // --- Drag & drop from palette ---
  const onDragOver=useCallback((e:DragEvent)=>{
    e.preventDefault()
    e.dataTransfer.dropEffect='move'
  },[])

  const onDrop=useCallback((e:DragEvent)=>{
    e.preventDefault()
    const type=e.dataTransfer.getData(NODE_DRAG_MIME) as NodeType
    if(!type || !(allNodeTypes as string[]).includes(type)) return
    const flowPos=rfInstance.current?.screenToFlowPosition({ x:e.clientX, y:e.clientY })
    const nid=addNode(type, flowPos || undefined)
    // auto-select the freshly dropped node so the sidebar immediately shows its config
    setTimeout(()=>{
      setNodes(curr=>{
        const found=curr.find(n=>n.id===nid)
        if(found) setSelected(found)
        return curr
      })
    },0)
  },[addNode])

  useEffect(()=>{
    const errs=validateGraph(nodes.map(n=>({id:n.id, type:(n.data as any).type, config:(n.data as any).config})), edges.map(e=>({id:e.id, source:e.source, target:e.target, sourceHandle:(e as any).sourceHandle, label:(e as any).label})))
    // Treat the graph as a draft if any of the following are true:
    //   - no saved jid (never saved)
    //   - no trigger yet (user is still laying out nodes)
    //   - no edges yet (user hasn't wired anything up)
    // In all these states "Unreachable node" is a false positive that fires
    // the moment any non-trigger node is added or dropped.
    const hasTrigger=nodes.some(n=>(n.data as any).type==='trigger')
    const draft=!jid || !hasTrigger || edges.length===0
    const filtered=draft ? errs.filter(e=>e.message!=='Unreachable node') : errs
    setValidation(filtered)
  },[nodes,edges,jid])

  const errorNodeIds=useMemo(()=>new Set(validation.map(e=>e.nodeId)),[validation])
  const errorsByNode=useMemo(()=>{
    const m=new Map<string,string[]>()
    validation.forEach(e=>{
      if(e.nodeId==='graph'||e.nodeId==='edges') return
      if(!m.has(e.nodeId)) m.set(e.nodeId, [])
      m.get(e.nodeId)!.push(e.message)
    })
    return m
  },[validation])
  const nodesWithErrorFlag=useMemo(()=>nodes.map(n=> ({...n, data:{...n.data, hasError: errorNodeIds.has(n.id), isHighlighted: highlightedId===n.id}})),[nodes,errorNodeIds,highlightedId])

  const save=async()=>{
    const graph={nodes: nodes.map(n=>({id:n.id, type:(n.data as any).type, config:(n.data as any).config, position:n.position})), edges: edges.map(e=>({id:e.id, source:e.source, target:e.target, sourceHandle:(e as any).sourceHandle, label:(e as any).label}))}
    if(!jid){
      const res=await journeyApi.post(`/api/campaigns/${id}/journeys`,{name:'Journey '+(Date.now()%1000), graph})
      setJid(res.data.id)
      alert('Saved journey '+res.data.id)
    } else {
      await journeyApi.put(`/api/campaigns/${id}/journeys/${jid}`,{graph})
      alert('Updated')
    }
  }
  const validate=async()=>{
    const graph={nodes: nodes.map(n=>({id:n.id, type:(n.data as any).type, config:(n.data as any).config})), edges: edges.map(e=>({id:e.id, source:e.source, target:e.target}))}
    const res=await journeyApi.post(`/api/campaigns/${id}/journeys/${jid}/validate`,{graph})
    alert(JSON.stringify(res.data,null,2))
  }
  const publish=async()=>{
    await journeyApi.post(`/api/campaigns/${id}/journeys/${jid}/publish`)
    alert('Published')
  }
  const runSim=async()=>{
    if(!jid) return alert('Save first')
    setRunning(true); setSessionLogs([])
    const res=await journeyApi.post(`/api/campaigns/${id}/journeys/${jid}/simulate`,{sessionCount:3})
    const {requestId, sessionIds}=res.data
    // Connect websocket via SockJS + Stomp; polling provides delivery resilience.
    const sid=sessionIds[0]
    let tries=0
    const poll=setInterval(async()=>{
      tries++
      try{
        const execs=await journeyApi.get(`/api/sessions/${sid}/executions`)
        setSessionLogs(execs.data)
        if(execs.data.length>0 && tries>10) {clearInterval(poll); setRunning(false)}
      }catch{}
      if(tries>20){clearInterval(poll); setRunning(false)}
    },800)
    // Also try STOMP over /ws
    try{
      const SockJS=await import('sockjs-client')
      const Stomp=await import('stompjs')
      const sock=new (SockJS as any).default(`${JOURNEY_URL}/ws`)
      const client=(Stomp as any).over(sock)
      client.debug=()=>{}
      client.connect({},()=>{
        setWsConnected(true)
        sessionIds.forEach((s:string)=>{
          client.subscribe(`/topic/sessions/${s}`,(msg:any)=>{
            const body=JSON.parse(msg.body)
            setSessionLogs(prev=>[...prev, body])
          })
        })
      })
    }catch(e){ console.log('ws fail',e)}
  }

  const loadJourney=(journey:any)=>{
    try{
      const g=JSON.parse(journey.graphJson||'{}')
      if(g.nodes){
        // Stagger x when the graph has no positions (for example, API-created graphs).
        // so nodes never stack on top of each other at a shared default
        setNodes(g.nodes.map((n:any,i:number)=>({id:n.id, position:n.position||{x:100+i*220,y:100+(i%2)*140}, data:{label:`${n.type} ${n.id.slice(0,4)}`, type:n.type, config:n.config}, type:'journeyNode'})))
        setEdges((g.edges||[]).map((e:any)=>({id:e.id, source:e.source, target:e.target, sourceHandle:e.sourceHandle, label:e.label})))
        setJid(journey.id)
      }
    }catch{}
  }

  const hasFitInitial=useRef(false)
  useEffect(()=>{
    if(nodes.length===0 || hasFitInitial.current) return
    const t=setTimeout(()=>{ rfInstance.current?.fitView({padding:0.2, duration:200}); hasFitInitial.current=true },150)
    return ()=>clearTimeout(t)
  },[nodes])

  // load existing: an explicit ?jid= wins; otherwise fall back to the campaign's
  // first existing journey so the canvas doesn't open blank when one already exists
  useEffect(()=>{
    if(!id) return
    if(presetJid){
      journeyApi.get(`/api/campaigns/${id}/journeys/${presetJid}`).then(r=>loadJourney(r.data))
    } else {
      journeyApi.get(`/api/campaigns/${id}/journeys`).then(r=>{
        if(r.data && r.data.length>0) loadJourney(r.data[0])
      })
    }
  },[presetJid,id])

  return <div className="h-[calc(100vh-120px)] flex flex-col">
    <div className="flex gap-2 mb-3 flex-wrap items-center">
      <span className="text-xs text-slate-500">Drag nodes from the palette onto the canvas.</span>
      <button onClick={save} className="bg-blue-600 text-white px-4 py-1 rounded text-sm">Save</button>
      <button onClick={validate} className="border px-4 py-1 rounded text-sm">Validate</button>
      <button onClick={publish} className="bg-green-600 text-white px-4 py-1 rounded text-sm">Publish</button>
      <button onClick={runSim} disabled={running} className="bg-purple-600 text-white px-4 py-1 rounded text-sm disabled:opacity-50">{running?'Running...':'Run Simulation (3 sessions)'}</button>
      {wsConnected && <span className="text-xs text-green-600">WS connected</span>}
    </div>
    {validation.length>0 && <div className="bg-red-50 border border-red-200 p-2 mb-2 text-xs">{validation.map((e,i)=><div key={i}>{e.nodeId}: {e.message}</div>)}</div>}
    <div className="flex-1 flex gap-4 min-h-0">
      <div className="w-44 border rounded bg-white p-2 overflow-auto flex-shrink-0">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 px-1 mb-1">Palette</div>
        <input value={paletteSearch} onChange={e=>setPaletteSearch(e.target.value)} placeholder="Search..." className="w-full mb-2 h-7 rounded border border-input bg-background px-2 text-xs" />
        {nodeTypesList.filter(t=> !paletteSearch || t.toLowerCase().includes(paletteSearch.toLowerCase())).map(t=>(
          <div
            key={t}
            draggable
            onDragStart={e=>{ e.dataTransfer.setData(NODE_DRAG_MIME, t); e.dataTransfer.effectAllowed='move' }}
            onDoubleClick={()=>addNode(t as any)}
            title={`Drag to canvas · double-click to add`}
            className="px-2 py-1.5 mb-1 rounded border border-slate-200 bg-white text-[11px] text-slate-700 cursor-grab active:cursor-grabbing hover:bg-slate-50 select-none"
          >
            {t.replace(/_/g, ' ')}
          </div>
        ))}
      </div>
      <div className="flex-1 border rounded bg-white min-w-0 relative" onDragOver={onDragOver} onDrop={onDrop}>
        <ReactFlow
          nodes={nodesWithErrorFlag}
          edges={edges.map(e=>({
            ...e,
            animated: e.id===selectedEdgeId,
            style: { strokeWidth: e.id===selectedEdgeId? 2.5 : 1.75, stroke: e.id===selectedEdgeId? 'hsl(243 75% 59%)' : 'hsl(215 16% 47%)' },
          }))}
          nodeTypes={reactFlowNodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          deleteKeyCode={['Delete','Backspace']}
          onInit={(inst)=>{rfInstance.current=inst}}
          fitView
          minZoom={0.1}
        >
          <Background /><Controls />
        </ReactFlow>
        {selectedEdgeId && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
            <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-white px-2 py-1 shadow-md">
              <span className="text-xs px-1">Edge</span>
              <button onClick={()=> deleteEdge(selectedEdgeId)} className="text-xs px-2 py-0.5 rounded bg-red-600 text-white">Delete</button>
              <button onClick={()=> setSelectedEdgeId(null)} className="text-xs px-1 text-slate-500">✕</button>
            </div>
          </div>
        )}
      </div>
      <div className="w-[380px] border rounded bg-white p-3 overflow-auto">
        <div className="flex gap-1 mb-3 border-b pb-2">
          <button onClick={()=>setSidePanel('config')} className={`text-xs px-3 py-1 rounded ${sidePanel==='config'?'bg-slate-900 text-white':'text-slate-500'}`}>Config</button>
          <button onClick={()=>setSidePanel('device')} className={`text-xs px-3 py-1 rounded ${sidePanel==='device'?'bg-slate-900 text-white':'text-slate-500'}`}>📱 Test on device</button>
        </div>
        {sidePanel==='device'
          ? <DevicePreviewPanel
              nodes={nodes.map(n=>({id:n.id, type:(n.data as any).type, config:(n.data as any).config}))}
              edges={edges.map(e=>({id:e.id, source:e.source, target:e.target, sourceHandle:(e as any).sourceHandle, label:(e as any).label}))}
            />
          : <>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Node config</h3>
          {selected && <span className="text-[10px] font-mono text-slate-400">{(selected.data as any).type}</span>}
        </div>
        {selected ? <JourneyConfigRouter
          type={(selected.data as any).type}
          config={(selected.data as any).config}
          errors={errorsByNode.get(selected.id)}
          onChange={next=>{
            setNodes(nds=>nds.map(n=> n.id===selected.id? {...n, data:{...n.data, config: next}}:n))
            setSelected((prev: any) => prev ? { ...prev, data: { ...prev.data, config: next } } : prev)
            bus.emit('node:update', { nodeId: selected.id, config: next })
          }}
        /> : <div className="text-xs opacity-60 mt-2">Click a node on the canvas to edit its configuration.</div>}
        <h3 className="font-semibold mt-6">Live Execution</h3>
        <div className="text-xs space-y-1 mt-2">
          {sessionLogs.map((l,i)=><div key={i} className="border-l-2 pl-2">{l.event||l.nodeType} {l.nodeId} {JSON.stringify(l).slice(0,80)}</div>)}
        </div>
        </>}
        {jid && <div className="mt-4 text-xs opacity-60">Journey ID: {jid}</div>}
      </div>
    </div>
  </div>
}
