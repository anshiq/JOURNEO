import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import ReactFlow, { Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge, type Connection, type Edge, type Node, type ReactFlowInstance } from 'reactflow'
import 'reactflow/dist/style.css'
import { allNodeTypes, defaultConfigFor, nodeInfo } from '../../nodes/_core/registry'
import type { NodeType } from '../../nodes/_core/types'
import { validateGraph } from '../../lib/validation'
import JourneyNodeRenderer from '../nodes/JourneyNodeRenderer'
import { JourneyConfigRouter } from '../../nodes/_core/ConfigRouter'
import { bus, useEvent } from '../../lib/eventBus'
import { toFlow, fromFlow, patchNode, defaultScreenValues, type JourneyGraph } from '../../lib/journeyGraph'
import { defaultScreen, seedBlockKey } from '../../lib/screen'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { Separator } from '../ui/Separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/Accordion'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/Tooltip'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/Command'
import { ArrowRight, HelpCircle, Link2, Palette, Plus, Search, Trash2 } from 'lucide-react'

export const NODE_DRAG_MIME = 'application/x-journey-node-type'

import ScreenGroupRenderer from './ScreenGroupRenderer'

const reactFlowNodeTypes = { journeyNode: JourneyNodeRenderer, flowNode: JourneyNodeRenderer, screenNode: ScreenGroupRenderer }

export interface JourneyGraphEditorProps {
  graph: JourneyGraph
  onGraphChange: (next: JourneyGraph) => void
  selectedNodeId: string | null
  onSelectNode: (id: string | null) => void
  readOnly?: boolean
}

function structuralFingerprint(nodes: Node[], edges: Edge[]): string {
  return JSON.stringify({
    nodes: nodes.map(n => [n.id, (n.data as any)?.type, (n.data as any)?.config]),
    edges: edges.map(e => [e.id, e.source, e.target, (e as any).sourceHandle, (e as any).label]),
  })
}

function graphStructuralFingerprint(g: JourneyGraph): string {
  return JSON.stringify({
    nodes: g.nodes.map(n => [n.id, n.type, n.config]),
    edges: g.edges.map(e => [e.id, e.source, e.target, e.sourceHandle, e.label]),
  })
}

function positionFingerprint(nodes: Node[]): string {
  return JSON.stringify(nodes.map(n => [n.id, n.position]))
}

function EdgeSummary({ edgeId, edges, nodes }: { edgeId: string; edges: Edge[]; nodes: Node[] }) {
  const edge = edges.find(e => e.id === edgeId)
  if (!edge) return null
  const source = nodes.find(n => n.id === edge.source)
  const target = nodes.find(n => n.id === edge.target)
  const label = (edge.data as any)?.label || (edge as any).label
  return (
    <div className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
      <span className="font-mono text-[10px] text-foreground/80">
        {(source?.data as any)?.type?.replace(/_/g, ' ') || edge.source}
      </span>
      <ArrowRight className="h-3 w-3 text-primary" />
      <span className="font-mono text-[10px] text-foreground/80">
        {(target?.data as any)?.type?.replace(/_/g, ' ') || edge.target}
      </span>
      {label && (
        <>
          <span className="h-4 w-px bg-border" />
          <Badge variant="outline" className="h-5 px-1.5 font-normal text-[10px]">
            {label}
          </Badge>
        </>
      )}
    </div>
  )
}

function EdgesList({
  edges, nodes, selectedEdgeId, onSelect, onDelete,
}: {
  edges: Edge[]
  nodes: Node[]
  selectedEdgeId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}) {
  if (edges.length === 0) {
    return (
      <div className="rounded-none border border-dashed bg-muted/30 p-4 text-center">
        <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-none bg-muted text-muted-foreground">
          <Link2 className="h-3.5 w-3.5" />
        </div>
        <p className="text-xs font-medium text-foreground">No connections yet</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Drag from a node&apos;s edge handle to another node to create a connection.
        </p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1.5">
      {edges.map(e => {
        const source = nodes.find(n => n.id === e.source)
        const target = nodes.find(n => n.id === e.target)
        const isSelected = e.id === selectedEdgeId
        return (
          <div
            key={e.id}
            className={cn(
              'group flex items-center gap-2 rounded-none border bg-card px-2 py-1.5 text-xs transition-colors',
              isSelected ? 'border-foreground ring-1 ring-foreground/20' : 'border-border/60 hover:border-foreground hover:bg-secondary',
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(e.id)}
              className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
              title="Select edge"
            >
              <span className="truncate font-mono text-[10px] text-foreground/80">
                {(source?.data as any)?.type?.replace(/_/g, ' ') || e.source}
              </span>
              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate font-mono text-[10px] text-foreground/80">
                {(target?.data as any)?.type?.replace(/_/g, ' ') || e.target}
              </span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 data-[visible=true]:opacity-100"
              onClick={() => onDelete(e.id)}
              aria-label="Delete edge"
              data-visible={isSelected}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}

function ConnectionsPanel({ edges, nodes, selectedEdgeId, onSelect, onDelete }: { edges: Edge[]; nodes: Node[]; selectedEdgeId: string | null; onSelect: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <Accordion type="single" collapsible defaultValue="connections">
      <AccordionItem value="connections" className="rounded-none border border-border/60 bg-card px-3">
        <AccordionTrigger>
          <span className="flex items-center gap-2 text-xs font-semibold normal-case tracking-normal">
            <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
            Connections
            <Badge variant="muted" className="font-mono text-[10px]">{edges.length}</Badge>
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <EdgesList edges={edges} nodes={nodes} selectedEdgeId={selectedEdgeId} onSelect={onSelect} onDelete={onDelete} />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Tip: select an edge and press <kbd className="rounded-none border bg-muted px-1 py-0.5 font-mono text-[10px]">Delete</kbd> to remove it.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export default function JourneyGraphEditor({ graph, onGraphChange, selectedNodeId, onSelectNode, readOnly = false }: JourneyGraphEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([])
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const highlightTimerRef = useRef<number | null>(null)
  const [validation, setValidation] = useState<any[]>([])
  const [paletteSearch, setPaletteSearch] = useState('')
  const [cmdOpen, setCmdOpen] = useState(false)
  const [cmdSearch, setCmdSearch] = useState('')
  const rfInstance = useRef<ReactFlowInstance | null>(null)
  const hasFitInitial = useRef(false)

  const seededRef = useRef(false)
  const structuralFpRef = useRef<string>('')
  const posFpRef = useRef<string>('')
  const suppressNextEmitRef = useRef(false)
  const debounceTimerRef = useRef<number | null>(null)
  const onGraphChangeRef = useRef(onGraphChange)
  onGraphChangeRef.current = onGraphChange
  const themeRef = useRef(graph.theme)
  themeRef.current = graph.theme

  useEffect(() => {
    const fp = graphStructuralFingerprint(graph)
    if (!seededRef.current || fp !== structuralFpRef.current) {
      const { nodes: n0, edges: e0 } = toFlow(graph)
      suppressNextEmitRef.current = true
      setNodes(n0)
      setEdges(e0)
      structuralFpRef.current = fp
      posFpRef.current = positionFingerprint(n0)
      seededRef.current = true
    }
  }, [graph, setNodes, setEdges])

  useEffect(() => {
    if (suppressNextEmitRef.current) { suppressNextEmitRef.current = false; return }
    if (readOnly) return
    const fp = structuralFingerprint(nodes, edges)
    if (fp !== structuralFpRef.current) {
      if (debounceTimerRef.current) { window.clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null }
      structuralFpRef.current = fp
      posFpRef.current = positionFingerprint(nodes)
      onGraphChangeRef.current(fromFlow(nodes, edges, themeRef.current))
      return
    }
    const posFp = positionFingerprint(nodes)
    if (posFp !== posFpRef.current) {
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = window.setTimeout(() => {
        posFpRef.current = posFp
        debounceTimerRef.current = null
        onGraphChangeRef.current(fromFlow(nodes, edges, themeRef.current))
      }, 250)
    }
  }, [nodes, edges, readOnly])

  useEffect(() => () => {
    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current)
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current)
  }, [])

  const flashNode = useCallback((nodeId: string) => {
    setHighlightedId(nodeId)
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current)
    highlightTimerRef.current = window.setTimeout(() => setHighlightedId(null), 500)
  }, [])

  useEvent('node:select', useCallback((p: any) => {
    if (p.nodeId) flashNode(p.nodeId)
  }, [flashNode]))

  const onConnect = useCallback((params: Connection) => {
    if (readOnly) return
    const src = nodes.find(n => n.id === params.source)
    const tgt = nodes.find(n => n.id === params.target)
    if (!src || !tgt || src.type === 'journeyNode' || tgt.type === 'journeyNode') return
    setEdges(eds => addEdge({ ...params, id: crypto.randomUUID() }, eds))
  }, [nodes, readOnly, setEdges])

  const addNode = useCallback((type: NodeType, position?: { x: number; y: number }) => {
    if (readOnly) return null
    const nid = crypto.randomUUID()
    const cfg = { ...defaultConfigFor(type) }
    if (['input', 'select', 'checkbox', 'rating'].includes(type) && !cfg.blockKey) cfg.blockKey = seedBlockKey()
    const pos = position || { x: 100 + Math.random() * 400, y: 100 + Math.random() * 300 }
    if (type === 'trigger' || type === 'condition' || type === 'end') {
      const flowNode: Node = { id: nid, type: 'flowNode', position: pos, data: { label: `${type} ${nid.slice(0, 4)}`, type, config: cfg } }
      setNodes(nds => [...nds, flowNode])
    } else {
      const screen = defaultScreen({ id: crypto.randomUUID(), name: `${type.replace(/_/g, ' ')} screen`, position: pos, blocks: [nid] })
      const screenNode: Node = { id: screen.id, type: 'screenNode', position: screen.position, style: { width: screen.size.width, height: screen.size.height }, data: { screen, exits: [screen.advance.handle], blockCount: 1 } }
      const blockNode: Node = { id: nid, type: 'journeyNode', parentNode: screen.id, extent: 'parent', position: { x: 12, y: 44 }, draggable: true, data: { label: `${type} ${nid.slice(0, 4)}`, type, config: cfg, screenId: screen.id, blockIndex: 0, isBlock: true } }
      setNodes(nds => [...nds, screenNode, blockNode])
    }
    bus.emit('node:track', { nodeId: nid, type, viewportId: 'iphone14' as any })
    onSelectNode(nid)
    bus.emit('node:select', { nodeId: nid, source: 'canvas' })
    return nid
  }, [readOnly, setNodes, onSelectNode])

  const addScreen = useCallback(() => {
    if (readOnly) return
    const screen = defaultScreen({ id: crypto.randomUUID(), name: `Screen ${nodes.filter(n => n.type === 'screenNode').length + 1}`, position: { x: 100, y: 100 } })
    setNodes(nds => [...nds, { id: screen.id, type: 'screenNode', position: screen.position, style: { width: screen.size.width, height: screen.size.height }, data: { screen, exits: [screen.advance.handle], blockCount: 0 } }])
    bus.emit('screen:select', { screenId: screen.id, source: 'canvas' })
  }, [nodes, readOnly, setNodes])

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedEdgeId(null)
    if (node.type === 'screenNode') {
      onSelectNode(null)
      bus.emit('screen:select', { screenId: node.id, source: 'canvas' })
      return
    }
    onSelectNode(node.id)
    flashNode(node.id)
    bus.emit('node:select', { nodeId: node.id, source: 'canvas' })
  }, [flashNode, onSelectNode])

  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    setSelectedEdgeId(edge.id)
    onSelectNode(null)
  }, [onSelectNode])

  const onPaneClick = useCallback(() => {
    setSelectedEdgeId(null)
  }, [])

  const deleteEdge = useCallback((edgeId: string) => {
    if (readOnly) return
    setEdges(eds => eds.filter(e => e.id !== edgeId))
    setSelectedEdgeId(prev => (prev === edgeId ? null : prev))
  }, [setEdges, readOnly])

  const deleteNode = useCallback((nodeId: string) => {
    if (readOnly) return
    setNodes(nds => nds.filter(n => n.id !== nodeId))
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId))
    onSelectNode(null)
  }, [setNodes, setEdges, readOnly, onSelectNode])

  const handleEdgesChange = useCallback((changes: any[]) => {
    if (readOnly) { changes = changes.filter(c => c.type !== 'remove') }
    onEdgesChange(changes)
    changes.forEach(c => {
      if (c.type === 'remove') setSelectedEdgeId(prev => (prev === c.id ? null : prev))
    })
  }, [onEdgesChange, readOnly])

  const handleNodesChange = useCallback((changes: any[]) => {
    if (readOnly) { changes = changes.filter(c => c.type !== 'remove') }
    onNodesChange(changes)
  }, [onNodesChange, readOnly])

  const onDragOver = useCallback((e: DragEvent) => {
    if (readOnly) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [readOnly])

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    if (readOnly) return
    const type = e.dataTransfer.getData(NODE_DRAG_MIME) as string
    if (!type || !(allNodeTypes as string[]).includes(type)) return
    const flowPos = rfInstance.current?.screenToFlowPosition({ x: e.clientX, y: e.clientY })
    addNode(type as any, flowPos || undefined)
  }, [addNode, readOnly])

  useEffect(() => {
    const draftGraph = fromFlow(nodes, edges, themeRef.current, graph.screens, graph.askAi)
    const errs = validateGraph(draftGraph)
    const draft = edges.length === 0 || !nodes.some(n => (n.data as any).type === 'trigger')
    const filtered = draft ? errs.filter(e => e.message !== 'Unreachable screen') : errs
    setValidation(filtered)
  }, [nodes, edges, graph.screens, graph.askAi])

  const errorNodeIds = useMemo(() => new Set(validation.map(e => e.nodeId)), [validation])
  const errorsByNode = useMemo(() => {
    const m = new Map<string, string[]>()
    validation.forEach(e => {
      if (e.nodeId === 'graph' || e.nodeId === 'edges') return
      if (!m.has(e.nodeId)) m.set(e.nodeId, [])
      m.get(e.nodeId)!.push(e.message)
    })
    return m
  }, [validation])
  const nodesWithErrorFlag = useMemo(() => nodes.map(n => ({ ...n, data: { ...n.data, hasError: errorNodeIds.has(n.id), isHighlighted: highlightedId === n.id } })), [nodes, errorNodeIds, highlightedId])

  useEffect(() => {
    if (nodes.length === 0 || hasFitInitial.current) return
    const t = window.setTimeout(() => {
      rfInstance.current?.fitView({ padding: 0.2, duration: 200 })
      hasFitInitial.current = true
    }, 150)
    return () => window.clearTimeout(t)
  }, [nodes])

  const selectedNode = useMemo(() => graph.nodes.find(n => n.id === selectedNodeId) ?? null, [graph, selectedNodeId])

  const onNodeConfigChange = useCallback((next: any) => {
    if (readOnly || !selectedNodeId) return
    const patched = patchNode(graph, selectedNodeId, { config: next })
    structuralFpRef.current = graphStructuralFingerprint(patched)
    posFpRef.current = JSON.stringify(patched.nodes.map(n => [n.id, n.position]))
    suppressNextEmitRef.current = true
    setNodes(nds => nds.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, config: next } } : n))
    onGraphChangeRef.current(patched)
    bus.emit('node:update', { nodeId: selectedNodeId, config: next })
  }, [readOnly, selectedNodeId, graph, setNodes])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (!readOnly) setCmdOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [readOnly])

  return (
    <div className="flex h-full flex-col gap-2">
      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput value={cmdSearch} onValueChange={setCmdSearch} placeholder="Search node types..." />
        <CommandList>
          <CommandEmpty>No node type found.</CommandEmpty>
          <CommandGroup heading="Node types">
            {allNodeTypes.filter(t => !cmdSearch || t.toLowerCase().includes(cmdSearch.toLowerCase())).map(t => (
              <CommandItem key={t} value={t} onSelect={() => { addNode(t as any); setCmdOpen(false); setCmdSearch('') }}>
                <span className="truncate">{t.replace(/_/g, ' ')}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">{nodeInfo[t]}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
      {validation.length > 0 && (
        <div className="flex items-start gap-1.5 rounded-none border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-xs text-destructive">
          <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="flex flex-col gap-0.5">
            {validation.slice(0, 3).map((e, i) => (
              <div key={i}><span className="font-mono opacity-70">{e.nodeId}:</span> {e.message}</div>
            ))}
            {validation.length > 3 && <div className="opacity-70">+{validation.length - 3} more</div>}
          </div>
        </div>
      )}

      <div className="flex h-full min-h-0 flex-1 gap-3">
        <Card className="flex h-full w-44 shrink-0 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b px-2 py-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Palette</span>
            <Badge variant="muted" className="h-5 px-1.5 text-[10px]">{allNodeTypes.length}</Badge>
          </div>
          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
            <Input value={paletteSearch} onChange={e => setPaletteSearch(e.target.value)} placeholder="Search..." className="h-7 mb-2 text-xs" />
            {!readOnly && (
              <button
                type="button"
                data-testid="palette-item-screen"
                onClick={addScreen}
                className="mb-2 flex w-full items-center gap-1.5 border border-primary/40 bg-primary/5 px-1.5 py-1 text-[11px] text-primary transition-colors hover:border-primary hover:bg-primary/10"
              >
                <Plus className="h-3 w-3" />
                <span className="flex-1 text-left">Screen</span>
              </button>
            )}
            {!readOnly && (
              <button
                type="button"
                onClick={() => setCmdOpen(true)}
                className="mb-2 flex w-full items-center gap-1.5 border border-border/60 bg-background px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                <Search className="h-3 w-3" />
                <span className="flex-1 text-left">Search nodes…</span>
                <kbd className="font-mono text-[10px]">⌘K</kbd>
              </button>
            )}
            {allNodeTypes.filter(t => !paletteSearch || t.toLowerCase().includes(paletteSearch.toLowerCase())).map(t => (
              <div
                key={t}
                data-testid={`palette-item-${t}`}
                draggable={!readOnly}
                onDragStart={e => { e.dataTransfer.setData(NODE_DRAG_MIME, t); e.dataTransfer.effectAllowed = 'move' }}
                onDoubleClick={() => addNode(t as any)}
                title={nodeInfo[t] || 'Drag to canvas · double-click to add'}
                className="group mb-0.5 flex cursor-grab items-center justify-between rounded-none border border-border/60 bg-background px-1.5 py-1 text-[11px] text-foreground/80 transition-colors hover:border-foreground hover:bg-secondary active:cursor-grabbing"
              >
                <span className="truncate">{t.replace(/_/g, ' ')}</span>
                <Plus className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="relative h-full w-full bg-muted/20" onDragOver={onDragOver} onDrop={onDrop}>
            <ReactFlow
              nodes={nodesWithErrorFlag}
              edges={edges.map(e => ({
                ...e,
                animated: e.id === selectedEdgeId,
                style: {
                  strokeWidth: e.id === selectedEdgeId ? 2.5 : 1.75,
                  stroke: e.id === selectedEdgeId ? 'hsl(var(--rouge))' : 'hsl(var(--foreground))',
                },
              }))}
              nodeTypes={reactFlowNodeTypes}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              onPaneClick={onPaneClick}
              nodesDraggable={!readOnly}
              nodesConnectable={!readOnly}
              deleteKeyCode={readOnly ? [] : ['Delete', 'Backspace']}
              onInit={inst => { rfInstance.current = inst }}
              fitView
              minZoom={0.1}
            >
              <Background gap={16} size={1} />
              <Controls className="!shadow-sm" />
              <MiniMap className="!shadow-sm" pannable zoomable />
            </ReactFlow>
            {selectedEdgeId && (
              <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2">
                <div className="pointer-events-auto flex items-center gap-2 rounded-none border border-primary/30 bg-background/95 px-2 py-1 shadow-overlay backdrop-blur">
                  <EdgeSummary edgeId={selectedEdgeId} edges={edges} nodes={nodes} />
                  <span className="h-4 w-px bg-border" />
                  {!readOnly && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 gap-1 rounded-none px-3 text-xs"
                          onClick={() => deleteEdge(selectedEdgeId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete edge
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Permanently remove this connection</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 rounded-none px-2 text-xs"
                        onClick={() => setSelectedEdgeId(null)}
                        aria-label="Deselect edge"
                      >
                        ✕
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear edge selection</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="flex w-[320px] shrink-0 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Node configuration</h3>
              {selectedNode && (
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {selectedNode.type}
                  </Badge>
                  {!readOnly && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-6 gap-1 rounded-none px-2 text-[10px]"
                      onClick={() => deleteNode(selectedNode.id)}
                      aria-label="Delete node"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </div>
            {selectedNode ? (
              <JourneyConfigRouter
                type={selectedNode.type}
                config={selectedNode.config}
                errors={errorsByNode.get(selectedNode.id)}
                onChange={onNodeConfigChange}
              />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-none border border-dashed bg-muted/30 px-4 py-10 text-center">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-none bg-primary/10 text-primary">
                  <Palette className="h-4 w-4" />
                </div>
                <p className="text-sm font-medium text-foreground">No node selected</p>
                <p className="mt-1 text-xs text-muted-foreground">Click a node on the canvas to edit its configuration.</p>
              </div>
            )}
            <Separator className="my-4" />
            <ConnectionsPanel edges={edges} nodes={nodes} selectedEdgeId={selectedEdgeId} onSelect={setSelectedEdgeId} onDelete={deleteEdge} />
          </div>
        </Card>
      </div>
    </div>
  )
}
