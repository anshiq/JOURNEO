import { useEffect, useMemo, useState, useCallback, useRef, type DragEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ReactFlow, { Background, Controls, useNodesState, useEdgesState, addEdge, Connection, Edge, Node, type ReactFlowInstance } from 'reactflow'
import 'reactflow/dist/style.css'
import { aiApi, journeyApi } from '../lib/api'
import { allNodeTypes, defaultConfigFor } from '../nodes/_core/registry'
import type { NodeType } from '../nodes/_core/types'
import type { NodeStyle } from '../nodes/_core/types'
import { validateGraph } from '../lib/validation'
import JourneyNodeRenderer from '../components/nodes/JourneyNodeRenderer'
import DevicePreviewPanel from '../components/preview/DevicePreviewPanel'
import { JourneyConfigRouter, StyleConfigRouter } from '../nodes/_core/ConfigRouter'
import { NODE_DRAG_MIME } from './JourneyCanvas'
import { type FlowNode, type FlowEdge } from '../components/preview/types'
import { bus, useEvent } from '../lib/eventBus'
import { DEVICE_VIEWPORTS, isViewportId } from '../lib/viewports'
import { devLinkFor } from '../lib/devLink'
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  HelpCircle,
  Layers,
  LayoutGrid,
  Link2,
  LockKeyhole,
  Maximize2,
  MessageSquare,
  MoveHorizontal,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Rocket,
  RotateCcw,
  Save,
  Sparkles,
  Square,
  Target,
  Trash2,
  Type as TypeIcon,
  Upload,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from '../components/ui/Button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Label } from '../components/ui/Label'
import { Badge } from '../components/ui/Badge'
import { Separator } from '../components/ui/Separator'
import { Slider } from '../components/ui/Slider'
import { Progress } from '../components/ui/Progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'

type Theme = { primary: string; accent: string; surface: string; foreground: string; font: string; radius: number; cta: string }

const steps = [
  { id: 'campaign', title: 'Define', subtitle: 'Name, audience & objective', icon: Target },
  { id: 'journey', title: 'Journey', subtitle: 'Build the customer path', icon: Layers },
  { id: 'experience', title: 'Experience', subtitle: 'Style & interactions', icon: Palette },
  { id: 'knowledge', title: 'Knowledge', subtitle: 'Train campaign RAG', icon: Brain },
  { id: 'publish', title: 'Publish', subtitle: 'Live link & distribution', icon: Rocket },
] as const

const nodeInfo: Record<string, string> = {
  trigger: 'Starts an audience session',
  condition: 'Branches on customer data',
  end: 'Completes the journey',
  text: 'Displays rich text content',
  image: 'Shows an image',
  video: 'Plays a video',
  button: 'Clickable button',
  input: 'Text input field',
  select: 'Dropdown select',
  checkbox: 'Checkbox input',
  rating: 'Star rating',
  badge: 'Label tag',
  divider: 'Separator line',
  alert: 'Alert notification',
  container: 'Layout container',
  card: 'Content card',
  hero_section: 'Hero banner section',
  quiz: 'Interactive quiz',
  form: 'Data collection form',
  countdown: 'Countdown timer',
}

const initialTheme: Theme = { primary: '#4f46e5', accent: '#f97316', surface: '#ffffff', foreground: '#111827', font: 'Inter', radius: 16, cta: 'Explore the collection' }

const STEP_COLORS = [
  { hex: '#22c55e', bg: 'bg-emerald-500', label: 'Initial reveal' },
  { hex: '#f43f5e', bg: 'bg-rose-500', label: 'Interaction 1' },
  { hex: '#3b82f6', bg: 'bg-blue-500', label: 'Interaction 2' },
  { hex: '#8b5cf6', bg: 'bg-violet-500', label: 'Interaction 3' },
  { hex: '#f59e0b', bg: 'bg-amber-500', label: 'Interaction 4' },
  { hex: '#06b6d4', bg: 'bg-cyan-500', label: 'Interaction 5' },
  { hex: '#ec4899', bg: 'bg-pink-500', label: 'Interaction 6' },
  { hex: '#6366f1', bg: 'bg-indigo-500', label: 'Interaction 7' },
]

type LegacyNodeStyleAlias = { label?: string; bg?: string; text?: string; border?: string; highlight?: string; shadow?: string; padding?: string; animation?: string }

const reactFlowNodeTypes = { journeyNode: JourneyNodeRenderer }

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
      <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center">
        <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
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
              'group flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-xs transition-colors',
              isSelected ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border/60 hover:border-primary/30 hover:bg-primary/5',
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

function ConnectionsDropdown({ edges, nodes, selectedEdgeId, onSelect, onDelete }: { edges: Edge[]; nodes: Node[]; selectedEdgeId: string | null; onSelect: (id: string) => void; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-border/60 bg-card">
      <button type="button" onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between px-3 py-2 text-left">
        <span className="flex items-center gap-2 text-xs font-semibold">
          <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
          Connections
          <Badge variant="muted" className="font-mono text-[10px]">{edges.length}</Badge>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="border-t border-border/60 p-2">
          <EdgesList edges={edges} nodes={nodes} selectedEdgeId={selectedEdgeId} onSelect={onSelect} onDelete={onDelete} />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Tip: select an edge and press <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">Delete</kbd> to remove it.
          </p>
        </div>
      )}
    </div>
  )
}

function EmbeddedJourneyCanvas({ campaignId, onComplete }: { campaignId: string; onComplete: () => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selected, setSelected] = useState<any>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const highlightTimer = useRef<number | null>(null)
  const [validation, setValidation] = useState<any[]>([])
  const [jid, setJid] = useState<string | null>(null)
  const [sidePanel, setSidePanel] = useState<'config' | 'preview'>('config')
  const [saving, setSaving] = useState(false)
  const [paletteSearch, setPaletteSearch] = useState('')
  const rfInstance = useRef<ReactFlowInstance | null>(null)

  const onConnect = useCallback((params: Connection) => setEdges(eds => addEdge({ ...params, id: `e-${Date.now()}` }, eds)), [setEdges])

  const addNode = useCallback((type: NodeType, position?: { x: number; y: number }) => {
    const nid = `n-${Date.now()}`
    const cfg = defaultConfigFor(type)
    const pos = position || { x: 100 + Math.random() * 400, y: 100 + Math.random() * 300 }
    const newNode: Node = { id: nid, type: 'journeyNode', position: pos, data: { label: `${type} ${nid.slice(0, 4)}`, type, config: cfg } }
    setNodes(nds => [...nds, newNode])
    bus.emit('node:track', { nodeId: nid, type, viewportId: 'iphone14' as any })
    bus.emit('node:select', { nodeId: nid, source: 'canvas' })
    return nid
  }, [setNodes])

  const flashNode = useCallback((nodeId: string) => {
    setHighlightedId(nodeId)
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current)
    highlightTimer.current = window.setTimeout(() => setHighlightedId(null), 500)
  }, [])

  useEvent('node:select', useCallback((p: any) => {
    if (!p.nodeId) { setSelected(null); return }
    const node = nodes.find(n => n.id === p.nodeId)
    if (node) { setSelected(node); setSelectedEdgeId(null); flashNode(p.nodeId) }
    else { setSelected(null) }
  }, [nodes, flashNode]))

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelected(node)
    setSelectedEdgeId(null)
    flashNode(node.id)
    bus.emit('node:select', { nodeId: node.id, source: 'canvas' })
  }, [flashNode])

  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    setSelectedEdgeId(edge.id)
    setSelected(null)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedEdgeId(null)
  }, [])

  const deleteEdge = useCallback((edgeId: string) => {
    setEdges(eds => eds.filter(e => e.id !== edgeId))
    setSelectedEdgeId(prev => (prev === edgeId ? null : prev))
  }, [setEdges])

  const handleEdgesChange = useCallback((changes: any[]) => {
    onEdgesChange(changes)
    changes.forEach(c => {
      if (c.type === 'remove') setSelectedEdgeId(prev => (prev === c.id ? null : prev))
    })
  }, [onEdgesChange])

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData(NODE_DRAG_MIME) as string
    if (!type || !(allNodeTypes as string[]).includes(type)) return
    const flowPos = rfInstance.current?.screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const nid = addNode(type as any, flowPos || undefined)
    setTimeout(() => {
      setNodes(curr => {
        const found = curr.find(n => n.id === nid)
        if (found) setSelected(found)
        return curr
      })
    }, 0)
  }, [addNode])

  useEffect(() => {
    const errs = validateGraph(nodes.map(n => ({ id: n.id, type: (n.data as any).type, config: (n.data as any).config })), edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: (e as any).sourceHandle, label: (e as any).label })))
    const hasTrigger = nodes.some(n => (n.data as any).type === 'trigger')
    const draft = !jid || !hasTrigger || edges.length === 0
    const filtered = draft ? errs.filter(e => e.message !== 'Unreachable node') : errs
    setValidation(filtered)
  }, [nodes, edges, jid])

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

  const save = async () => {
    const graph = { nodes: nodes.map(n => ({ id: n.id, type: (n.data as any).type, config: (n.data as any).config, position: n.position })), edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: (e as any).sourceHandle, label: (e as any).label })) }
    setSaving(true)
    try {
      if (!jid) {
        const res = await journeyApi.post(`/api/campaigns/${campaignId}/journeys`, { name: 'Journey ' + (Date.now() % 1000), graph })
        setJid(res.data.id)
      } else {
        await journeyApi.put(`/api/campaigns/${campaignId}/journeys/${jid}`, { graph })
      }
    } finally {
      setSaving(false)
    }
  }

  const loadJourney = (journey: any) => {
    try {
      const g = JSON.parse(journey.graphJson || '{}')
      if (g.nodes) {
        setNodes(g.nodes.map((n: any, i: number) => ({ id: n.id, position: n.position || { x: 100 + i * 220, y: 100 + (i % 2) * 140 }, data: { label: `${n.type} ${n.id.slice(0, 4)}`, type: n.type, config: n.config }, type: 'journeyNode' })))
        setEdges((g.edges || []).map((e: any) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, label: e.label })))
        setJid(journey.id)
      }
    } catch { }
  }

  const hasFitInitial = useRef(false)
  useEffect(() => {
    if (nodes.length === 0 || hasFitInitial.current) return
    const t = setTimeout(() => {
      rfInstance.current?.fitView({ padding: 0.2, duration: 200 })
      hasFitInitial.current = true
    }, 150)
    return () => clearTimeout(t)
  }, [nodes])

  useEffect(() => {
    if (!campaignId) return
    journeyApi.get(`/api/campaigns/${campaignId}/journeys`).then(r => {
      if (r.data && r.data.length > 0) loadJourney(r.data[0])
    }).catch(() => { })
  }, [campaignId])

  const flowNodes: FlowNode[] = nodes.map(n => ({ id: n.id, type: (n.data as any).type, config: (n.data as any).config }))
  const flowEdges: FlowEdge[] = edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: (e as any).sourceHandle, label: (e as any).label }))

  return (
    <div className="flex h-full flex-col gap-2">
      {validation.length > 0 && (
        <div className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-xs text-destructive">
          <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="flex flex-col gap-0.5">
            {validation.map((e, i) => (
              <div key={i}><span className="font-mono opacity-70">{e.nodeId}:</span> {e.message}</div>
            ))}
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
            <Input value={paletteSearch} onChange={e=>setPaletteSearch(e.target.value)} placeholder="Search..." className="h-7 mb-2 text-xs" />
            {allNodeTypes.filter(t=> !paletteSearch || t.toLowerCase().includes(paletteSearch.toLowerCase())).map(t => (
              <div
                key={t}
                draggable
                onDragStart={e => { e.dataTransfer.setData(NODE_DRAG_MIME, t); e.dataTransfer.effectAllowed = 'move' }}
                onDoubleClick={() => addNode(t as any)}
                title={nodeInfo[t] || `Drag to canvas · double-click to add`}
                className="group mb-0.5 flex cursor-grab items-center justify-between rounded-md border border-border/60 bg-background px-1.5 py-1 text-[11px] text-foreground/80 transition-colors hover:border-primary/40 hover:bg-primary/5 active:cursor-grabbing"
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
                  stroke: e.id === selectedEdgeId ? 'hsl(var(--primary))' : 'hsl(215 16% 47%)',
                },
              }))}
              nodeTypes={reactFlowNodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              onPaneClick={onPaneClick}
              deleteKeyCode={['Delete', 'Backspace']}
              onInit={inst => { rfInstance.current = inst }}
              fitView
              minZoom={0.1}
            >
              <Background gap={16} size={1} />
              <Controls className="!shadow-sm" />
            </ReactFlow>
            {selectedEdgeId && (
              <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2">
                <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-primary/30 bg-background/95 px-2 py-1 shadow-elevated backdrop-blur">
                  <EdgeSummary edgeId={selectedEdgeId} edges={edges} nodes={nodes} />
                  <span className="h-4 w-px bg-border" />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 gap-1 rounded-full px-3 text-xs"
                    onClick={() => deleteEdge(selectedEdgeId)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete edge
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-full px-2 text-xs"
                    onClick={() => setSelectedEdgeId(null)}
                    aria-label="Deselect edge"
                  >
                    ✕
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="flex w-[320px] shrink-0 flex-col overflow-hidden">
          <Tabs value={sidePanel} onValueChange={v => setSidePanel(v as 'config' | 'preview')} className="flex h-full flex-col">
            <div className="border-b px-3 pt-3">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="config" className="gap-1.5"><Palette className="h-3.5 w-3.5" /> Config</TabsTrigger>
                <TabsTrigger value="preview" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> Preview</TabsTrigger>
              </TabsList>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 scrollbar-thin">
              <TabsContent value="config" className="mt-0 flex flex-col gap-4">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Node configuration</h3>
                    {selected && (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {(selected.data as any).type}
                      </Badge>
                    )}
                  </div>
                  {selected ? (
                    <JourneyConfigRouter
                      type={(selected.data as any).type}
                      config={(selected.data as any).config}
                      errors={errorsByNode.get(selected.id)}
                      onChange={next => {
                        setNodes(nds => nds.map(n => n.id === selected.id ? { ...n, data: { ...n.data, config: next } } : n))
                        setSelected((prev: any) => prev ? { ...prev, data: { ...prev.data, config: next } } : prev)
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 px-4 py-10 text-center">
                      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Palette className="h-4 w-4" />
                      </div>
                      <p className="text-sm font-medium text-foreground">No node selected</p>
                      <p className="mt-1 text-xs text-muted-foreground">Click a node on the canvas to edit its configuration.</p>
                    </div>
                  )}
                </div>
                <Separator />
                <ConnectionsDropdown edges={edges} nodes={nodes} selectedEdgeId={selectedEdgeId} onSelect={setSelectedEdgeId} onDelete={deleteEdge} />
              </TabsContent>
              <TabsContent value="preview" className="mt-0 h-full">
                <div className="h-[420px]">
                  <DevicePreviewPanel nodes={flowNodes} edges={flowEdges} />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>

      <div className="flex items-center justify-between border-t pt-2">
        <div className="flex items-center gap-2">
          {jid && <Badge variant="muted" className="font-mono text-[10px]">{jid.slice(0, 8)}</Badge>}
          <Button onClick={save} size="sm" disabled={saving} className="h-8 gap-1.5">
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving…' : jid ? 'Save changes' : 'Save journey'}
          </Button>
        </div>
        <Button onClick={onComplete} variant="default" className="gap-2">
          I&apos;ve saved my journey
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function StatusPill({ kind, children }: { kind: 'success' | 'warning' | 'info' | 'muted'; children: React.ReactNode }) {
  return <Badge variant={kind}>{children}</Badge>
}

function StepSidebarHeader({ step, stepsList, setStep }: { step: number; stepsList: typeof steps; setStep: (n: number) => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {stepsList.map((s, index) => {
        const Icon = s.icon
        const isActive = step === index
        const isComplete = step > index
        return (
          <button
            key={s.id}
            onClick={() => setStep(index)}
            className={cn(
              'group flex w-full items-center gap-2 rounded-md border p-2 text-left transition-all',
              isActive && 'border-primary/50 bg-primary text-primary-foreground shadow-sm',
              !isActive && isComplete && 'border-primary/20 bg-primary/5 text-foreground hover:bg-primary/10',
              !isActive && !isComplete && 'border-transparent bg-transparent text-muted-foreground hover:bg-muted',
            )}
          >
            <div className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold transition',
              isActive && 'bg-primary-foreground/20 text-primary-foreground',
              !isActive && isComplete && 'bg-primary/15 text-primary',
              !isActive && !isComplete && 'bg-muted text-muted-foreground',
            )}>
              {isComplete ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className={cn('text-xs font-semibold', isActive ? 'text-primary-foreground' : 'text-foreground')}>
                {s.title}
              </div>
            </div>
          </button>
        )
      })}
    </nav>
  )
}

function CollapsedStepRail({
  step, stepsList, setStep, onExpand, progressPct,
}: {
  step: number
  stepsList: typeof steps
  setStep: (n: number) => void
  onExpand: () => void
  progressPct: number
}) {
  return (
    <>
      <div className="flex items-center justify-center border-b border-sidebar-border py-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onExpand}
          className="h-7 w-7 text-sidebar-foreground/70 hover:bg-sidebar-border hover:text-sidebar-foreground"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="h-3.5 w-3.5" />
        </Button>
      </div>
      <nav className="flex flex-1 flex-col items-stretch gap-1 overflow-y-auto px-1 py-2 scrollbar-thin">
        {stepsList.map((s, index) => {
          const Icon = s.icon
          const isActive = step === index
          const isComplete = step > index
          return (
            <button
              key={s.id}
              onClick={() => setStep(index)}
              title={`${s.title} · ${s.subtitle}`}
              aria-label={s.title}
              className={cn(
                'group relative flex h-8 w-8 items-center justify-center self-center rounded-md transition-all',
                isActive && 'bg-primary text-primary-foreground shadow-sm',
                !isActive && isComplete && 'bg-primary/15 text-primary hover:bg-primary/25',
                !isActive && !isComplete && 'text-sidebar-foreground/60 hover:bg-sidebar-border hover:text-sidebar-foreground',
              )}
            >
              {isComplete ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              {isActive && <span className="absolute right-0.5 top-0.5 h-1 w-1 animate-pulse rounded-full bg-primary-foreground" />}
            </button>
          )
        })}
      </nav>
      <div className="flex flex-col items-center gap-1 border-t border-sidebar-border py-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-sidebar-border">
          <span className="font-mono text-[9px] text-sidebar-foreground/80">{progressPct}%</span>
        </div>
      </div>
    </>
  )
}

function ExpandedSidebar({
  id, campaign, step, stepsList, setStep, progressPct, onCollapse,
}: {
  id: string
  campaign: any
  step: number
  stepsList: typeof steps
  setStep: (n: number) => void
  progressPct: number
  onCollapse: () => void
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-sidebar-border px-2 py-2">
        <Link
          to={`/campaigns/${id}`}
          className="inline-flex min-w-0 items-center gap-1 text-[11px] text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground"
          title="Campaign overview"
        >
          <ArrowLeft className="h-3 w-3" />
          <span className="truncate">Overview</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCollapse}
          className="h-7 w-7 text-sidebar-foreground/60 hover:bg-sidebar-border hover:text-sidebar-foreground"
          aria-label="Collapse sidebar"
          title="Collapse sidebar (give canvas more room)"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex items-center border-b border-sidebar-border px-2 py-2">
        <h2 className="truncate text-xs font-semibold text-sidebar-foreground">
          {campaign?.name || 'Campaign workspace'}
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin">
        <StepSidebarHeader step={step} stepsList={stepsList} setStep={setStep} />
      </div>
      <div className="border-t border-sidebar-border px-2 py-2">
        <div className="flex items-center justify-between text-[11px] text-sidebar-foreground/60">
          <span>Workspace progress</span>
          <span className="font-mono text-sidebar-foreground">{progressPct}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sidebar-border">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
    </>
  )
}

export default function CampaignSetup() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialStep = (() => {
    const s = searchParams.get('step')
    if (s !== null) {
      const n = parseInt(s, 10)
      if (!isNaN(n) && n >= 0 && n < steps.length) return n
      const idx = steps.findIndex(x => x.id === s)
      if (idx !== -1) return idx
    }
    try { const v = localStorage.getItem(`workspace:${id}:step`); if (v !== null) { const n = parseInt(v, 10); if (!isNaN(n) && n >=0 && n < steps.length) return n } } catch {}
    return 0
  })()
  const [step, setStep] = useState(initialStep)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('workspace:sidebarCollapsed') === '1' } catch { return false }
  })
  const [campaign, setCampaign] = useState<any>(null)
  const [name, setName] = useState('')
  const [objective, setObjective] = useState('')
  const [audience, setAudience] = useState('')
  const [brief, setBrief] = useState('')
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [nodeOverrides, setNodeOverrides] = useState<Record<string, Partial<Theme>>>({})
  const [nodeStyles, setNodeStyles] = useState<Record<string, NodeStyle>>({})
  const [campaignNodes, setCampaignNodes] = useState<FlowNode[]>([])
  const [campaignEdges, setCampaignEdges] = useState<FlowEdge[]>([])
  const [journeys, setJourneys] = useState<any[]>([])
  const [website, setWebsite] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [knowledgeStatus, setKnowledgeStatus] = useState<{ kind: 'loading' | 'success' | 'error'; message: string } | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [publishStatus, setPublishStatus] = useState<{ kind: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [devCopied, setDevCopied] = useState(false)
  useEffect(() => {
    try { localStorage.setItem(`workspace:${id}:step`, String(step)) } catch {}
    const cur = searchParams.get('step')
    if (cur !== String(step)) {
      const next = new URLSearchParams(searchParams)
      next.set('step', String(step))
      setSearchParams(next, { replace: true })
    }
  }, [step, id])
  useEffect(() => {
    try { localStorage.setItem('workspace:sidebarCollapsed', sidebarCollapsed ? '1' : '0') } catch {}
  }, [sidebarCollapsed])
  useEffect(() => {
    const onPop = () => {
      const s = new URLSearchParams(window.location.search).get('step')
      if (s !== null) {
        const n = parseInt(s, 10)
        if (!isNaN(n) && n >= 0 && n < steps.length) setStep(n)
        else {
          const idx = steps.findIndex(x => x.id === s)
          if (idx !== -1) setStep(idx)
        }
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const hasSyncedUrlRef = useRef(false)
  useEffect(() => {
    if (hasSyncedUrlRef.current || campaignNodes.length === 0) return
    const qp = new URLSearchParams(window.location.search)
    const qpNode = qp.get('node')
    const qpViewport = qp.get('viewport')
    let did = false
    if (qpNode && campaignNodes.some(n => n.id === qpNode)) { bus.emit('node:select', { nodeId: qpNode, source: 'toolbar' }); did = true }
    if (isViewportId(qpViewport)) { bus.emit('device:viewportChange', { viewportId: qpViewport, width: DEVICE_VIEWPORTS[qpViewport].width, height: DEVICE_VIEWPORTS[qpViewport].height }); did = true }
    if (did) hasSyncedUrlRef.current = true
  }, [campaignNodes])
  useEffect(() => {
    const hNode = (p: any) => {
      if (!p.nodeId) {
        setSearchParams(prev => {
          const next = new URLSearchParams(prev)
          if (next.has('node')) { next.delete('node'); return next }
          return prev
        }, { replace: true })
        return
      }
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (next.get('node') !== p.nodeId) { next.set('node', p.nodeId); return next }
        return prev
      }, { replace: true })
    }
    const hVp = (p: any) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (next.get('viewport') !== p.viewportId) { next.set('viewport', p.viewportId); return next }
        return prev
      }, { replace: true })
    }
    bus.on('node:select', hNode as any)
    bus.on('device:viewportChange', hVp as any)
    return () => { bus.off('node:select', hNode as any); bus.off('device:viewportChange', hVp as any) }
  }, [setSearchParams])

  useEvent('node:select', useCallback((p: any) => setSelectedNodeId(p.nodeId), []))
  useEvent('node:update', useCallback((p: any) => {
    if (p.style) setNodeStyles(prev => ({ ...prev, [p.nodeId]: { ...prev[p.nodeId], ...p.style } }))
    if (p.config?.theme) setNodeOverrides(prev => ({ ...prev, [p.nodeId]: { ...prev[p.nodeId], ...p.config.theme } }))
  }, []))
  useEffect(() => {
    const handler = (p: any) => { if (id) journeyApi.post(`/api/campaigns/${id}/track`, { nodeId: p.nodeId, type: p.type, handle: p.handle, viewportId: p.viewportId, devToken: campaign?.devToken }).catch(() => {}) }
    bus.on('node:track', handler as any)
    return () => { bus.off('node:track', handler as any) }
  }, [id, campaign?.devToken])

  const updateNodeOverride = (key: keyof Theme, value: string | number) => {
    if (!selectedNodeId) return
    setNodeOverrides(prev => ({ ...prev, [selectedNodeId]: { ...prev[selectedNodeId], [key]: value } }))
    bus.emit('node:update', { nodeId: selectedNodeId, config: { theme: { [key]: value } } })
  }

  const updateNodeStyle = (key: keyof NodeStyle, value: any) => {
    if (!selectedNodeId) return
    setNodeStyles(prev => ({ ...prev, [selectedNodeId]: { ...prev[selectedNodeId], [key]: value } }))
    bus.emit('node:update', { nodeId: selectedNodeId, config: {}, style: { [key]: value } as any })
  }

  const updateNodeConfig = (next: any) => {
    if (!selectedNodeId) return
    setCampaignNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, config: next } : n))
    bus.emit('node:update', { nodeId: selectedNodeId, config: next })
  }

  const refreshJourneys = async () => {
    if (!id) return
    const response = await journeyApi.get(`/api/campaigns/${id}/journeys`)
    setJourneys(response.data || [])
    if (response.data && response.data.length > 0) {
      try {
        const g = JSON.parse(response.data[0].graphJson || '{}')
        setCampaignNodes((g.nodes || []).map((n: any) => ({ id: n.id, type: n.type, config: n.config || {}, position: n.position })))
        setCampaignEdges((g.edges || []).map((e: any) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, label: e.label })))
        if (g.theme) setTheme(g.theme)
        if (g.nodeStyles) setNodeStyles(g.nodeStyles)
        if (g.nodeOverrides) setNodeOverrides(g.nodeOverrides)
      } catch { }
    }
  }

  useEffect(() => {
    if (!id) return
    journeyApi.get(`/api/campaigns/${id}`).then(response => {
      setCampaign(response.data)
      setName(response.data.name || '')
      setBrief(response.data.description || '')
    }).catch(() => navigate('/campaigns'))
    refreshJourneys().catch(() => undefined)
  }, [id])

  useEffect(() => {
    if (step === 1 || step === 2) setSidebarCollapsed(true)
    else setSidebarCollapsed(false)
  }, [step])

  const productLink = useMemo(() => `${window.location.origin}/c/${id}`, [id])
  const devLink = useMemo(() => campaign?.devToken ? devLinkFor(campaign.devToken) : '', [campaign?.devToken])
  const isPublished = journeys[0]?.status === 'PUBLISHED'
  const shareLink = useMemo(() => isPublished ? productLink : (devLink || productLink), [isPublished, devLink, productLink])
  const updateTheme = (key: keyof Theme, value: string | number) => setTheme(current => ({ ...current, [key]: value }))

  const saveDetails = async () => {
    if (!name.trim()) return
    try {
      const response = await journeyApi.put(`/api/campaigns/${id}`, { name, description: brief })
      setCampaign(response.data)
      setStep(1)
    } catch { setCampaign((current: any) => ({ ...current, name, description: brief })) ; setStep(1) }
  }

  const ingestWebsite = async () => {
    if (!website.trim()) return
    setKnowledgeStatus({ kind: 'loading', message: 'Training campaign knowledge…' })
    try {
      const response = await aiApi.post('/v1/knowledge/sources/web', { url: website, title: `${name} campaign source` })
      setKnowledgeStatus({ kind: 'success', message: `Website trained — ${response.data.chunks} knowledge chunks are ready for retrieval.` })
      setWebsite('')
    } catch { setKnowledgeStatus({ kind: 'error', message: 'The website could not be ingested. Confirm the URL is publicly reachable and try again.' }) }
  }

  const ingestQa = async () => {
    if (!question.trim() || !answer.trim()) return
    setKnowledgeStatus({ kind: 'loading', message: 'Training campaign knowledge…' })
    try {
      const response = await aiApi.post('/v1/knowledge/sources/qa', { question, answer })
      setKnowledgeStatus({ kind: 'success', message: `Answer trained — ${response.data.chunks} knowledge chunk is ready for retrieval.` })
      setQuestion(''); setAnswer('')
    } catch { setKnowledgeStatus({ kind: 'error', message: 'The answer could not be trained. Please try again.' }) }
  }

  const ingestPdf = async (file?: File) => {
    if (!file) return
    setKnowledgeStatus({ kind: 'loading', message: 'Uploading and training PDF…' })
    const data = new FormData(); data.append('file', file); data.append('title', `${name} campaign document`)
    try {
      const response = await aiApi.post('/v1/knowledge/sources/pdf', data)
      setKnowledgeStatus({ kind: 'success', message: `PDF trained — ${response.data.chunks} knowledge chunks are ready for retrieval.` })
    } catch { setKnowledgeStatus({ kind: 'error', message: 'The PDF could not be ingested. Try another file.' }) }
  }

  const publish = async () => {
    const journey = journeys[0]
    if (!journey) { setPublishStatus({ kind: 'error', message: 'Create and save a journey before publishing.' }); return }
    setPublishing(true); setPublishStatus({ kind: 'info', message: 'Validating and publishing…' })
    try {
      await persistStyledGraph()
      const res = await journeyApi.post(`/api/campaigns/${id}/journeys/${journey.id}/publish`)
      setJourneys(prev => prev.map(j => j.id === journey.id ? { ...j, status: 'PUBLISHED', graphJson: res.data?.graphJson || j.graphJson } : j))
      setPublishStatus({ kind: 'success', message: 'Published successfully. Your campaign link is ready to share.' })
      await refreshJourneys()
    } catch (error: any) {
      const messages = error?.response?.data?.errors?.map((item: any) => item.message).join(' ') || 'Resolve journey validation issues and try again.'
      setPublishStatus({ kind: 'error', message: messages })
    } finally { setPublishing(false) }
  }

  const copyShareLink = () => {
    navigator.clipboard?.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  const copyDevLink = () => {
    if (!devLink) return
    navigator.clipboard?.writeText(devLink)
    setDevCopied(true)
    setTimeout(() => setDevCopied(false), 1800)
  }
  const rotateDevLink = async () => {
    if (!id) return
    const res = await journeyApi.post(`/api/campaigns/${id}/dev-link/rotate`)
    setCampaign((prev: any) => prev ? { ...prev, devToken: res.data.devToken } : prev)
    bus.emit('campaign:devLinkRotated', { campaignId: id, devToken: res.data.devToken })
  }

  const styledPreviewNodes = useMemo(() => campaignNodes.map(n => {
    const override = nodeOverrides[n.id] || {}
    const customStyle = nodeStyles[n.id] || {}
    return {
      ...n,
      config: {
        ...n.config,
        theme: {
          primary: override.primary || theme.primary,
          accent: override.accent || theme.accent,
          surface: override.surface || theme.surface,
          foreground: override.foreground || theme.foreground,
          font: override.font || theme.font,
          radius: override.radius ?? theme.radius,
          cta: override.cta || theme.cta
        },
        style: customStyle
      }
    }
  }), [campaignNodes, theme, nodeOverrides, nodeStyles])
  const persistStyledGraph = useCallback(async () => {
    const j = journeys[0]
    if (!j || !id || campaignNodes.length === 0) return
    const graph = {
      nodes: campaignNodes.map((n: any) => {
        const style = nodeStyles[n.id] || {}
        const override = nodeOverrides[n.id] || {}
        const base = n.config || {}
        const hasOverride = Object.keys(override).length > 0
        const hasStyle = Object.keys(style).length > 0
        return {
          id: n.id,
          type: n.type,
          position: (n as any).position,
          config: {
            ...base,
            theme: hasOverride || !base.theme ? { primary: override.primary || theme.primary, accent: override.accent || theme.accent, surface: override.surface || theme.surface, foreground: override.foreground || theme.foreground, font: override.font || theme.font, radius: override.radius ?? theme.radius, cta: override.cta || theme.cta } : base.theme,
            style: hasStyle ? style : base.style
          }
        }
      }),
      edges: campaignEdges,
      theme,
      nodeStyles,
      nodeOverrides
    }
    await journeyApi.put(`/api/campaigns/${id}/journeys/${j.id}`, { graph })
  }, [id, journeys, campaignNodes, campaignEdges, theme, nodeStyles, nodeOverrides])
  const hasPersistedRef = useRef(false)
  useEffect(() => {
    if (!journeys[0] || campaignNodes.length === 0 || !hasPersistedRef.current) { hasPersistedRef.current = true; return }
    const t = setTimeout(() => { persistStyledGraph().catch(() => undefined) }, 800)
    return () => clearTimeout(t)
  }, [theme, nodeStyles, nodeOverrides, campaignNodes, persistStyledGraph])
  useEffect(() => { if (journeys.length > 0) hasPersistedRef.current = false }, [journeys.length])

  const selectedNode = selectedNodeId ? campaignNodes.find(n => n.id === selectedNodeId) : null
  const progressPct = useMemo(() => {
    const known = [Boolean(name.trim()), journeys.length > 0, campaignNodes.length > 0, Boolean(knowledgeStatus?.kind === 'success'), Boolean(publishStatus?.kind === 'success')]
    const done = known.filter(Boolean).length
    return Math.round((done / known.length) * 100)
  }, [name, journeys, campaignNodes, knowledgeStatus, publishStatus])

  const currentStep = steps[step]
  const StepIcon = currentStep.icon

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex',
          sidebarCollapsed ? 'w-10' : 'w-44',
        )}
      >
        {sidebarCollapsed ? (
          <CollapsedStepRail step={step} stepsList={steps} setStep={setStep} onExpand={() => setSidebarCollapsed(false)} progressPct={progressPct} />
        ) : (
          <ExpandedSidebar
            id={id}
            campaign={campaign}
            step={step}
            stepsList={steps}
            setStep={setStep}
            progressPct={progressPct}
            onCollapse={() => setSidebarCollapsed(true)}
          />
        )}
      </aside>

      {/* Main */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between gap-2 border-b bg-background px-3 py-1.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <StepIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {step + 1} of {steps.length}
                </span>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-xs text-muted-foreground">{currentStep.subtitle}</span>
              </div>
              <h1 className="text-lg font-semibold text-foreground">{currentStep.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {campaign?.devToken && (
              <Badge variant="outline" className="hidden font-mono text-[10px] sm:inline-flex gap-1">
                DEV · /d/{campaign.devToken.slice(0,8)}
                <button onClick={copyDevLink} className="ml-1 rounded p-0.5 hover:bg-muted"><Copy className="h-3 w-3" /></button>
                <button onClick={rotateDevLink} className="ml-0.5 rounded p-0.5 hover:bg-muted" title="Rotate dev link"><RotateCcw className="h-3 w-3" /></button>
                {devCopied && <span className="text-emerald-600">Copied</span>}
              </Badge>
            )}
            <Badge variant="muted" className="hidden font-mono text-[10px] sm:inline-flex">
              <LockKeyhole className="mr-1 h-3 w-3" />
              {id.slice(0, 8)}
            </Badge>
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStep(s => Math.max(0, s - 1))} className="gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            )}
            {step < steps.length - 1 && step !== 1 && step !== 2 && (
              <Button
                size="sm"
                onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}
                className="gap-1.5"
                disabled={step === 0 && !name.trim()}
              >
                Skip
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col animate-fade-in overflow-hidden">
            {step === 0 && (
              <Card className="border-border/60 shadow-soft">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <StatusPill kind="info">Step 1</StatusPill>
                    <StatusPill kind="muted">~2 min</StatusPill>
                  </div>
                  <CardTitle className="text-xl">Define the campaign</CardTitle>
                  <CardDescription>
                    Start with the context your team needs to build a focused journey.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="campaign-name">
                      Campaign name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="campaign-name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Summer product launch"
                      className="h-9"
                    />
                    <p className="text-xs text-muted-foreground">A short, recognizable label shown across the product.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="objective" className="flex items-center gap-1">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        Objective
                      </Label>
                      <Input
                        id="objective"
                        value={objective}
                        onChange={e => setObjective(e.target.value)}
                        placeholder="Drive qualified leads"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="audience" className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        Audience
                      </Label>
                      <Input
                        id="audience"
                        value={audience}
                        onChange={e => setAudience(e.target.value)}
                        placeholder="Returning site visitors"
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="brief" className="flex items-center gap-1">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      Campaign brief
                    </Label>
                    <Textarea
                      id="brief"
                      value={brief}
                      onChange={e => setBrief(e.target.value)}
                      placeholder="Describe the offer, message, and the action you want the customer to take."
                      className="min-h-[100px]"
                    />
                  </div>
                </CardContent>
                <div className="flex items-center justify-between border-t bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">You can edit any of this later.</p>
                  <Button onClick={saveDetails} disabled={!name.trim()} className="gap-2">
                    Continue to journey
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}

            {step === 1 && (
              <div className="flex h-full min-h-0 flex-col">
                <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-background shadow-soft">
                  <EmbeddedJourneyCanvas campaignId={id} onComplete={() => { refreshJourneys(); setStep(2) }} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden">
                  <Card className="flex min-h-[420px] flex-col overflow-hidden bg-card shadow-sm lg:min-h-0">
                    <div className="flex min-h-0 flex-1 flex-col p-2">
                      {campaignNodes.length > 0 ? (
                        <DevicePreviewPanel nodes={styledPreviewNodes} edges={campaignEdges} />
                      ) : (
                        <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-dashed bg-muted/20">
                          <div className="max-w-sm text-center p-6">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-background border shadow-sm">
                              <Eye className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <h3 className="text-sm font-semibold">Save a journey first</h3>
                            <p className="mt-1 text-xs text-muted-foreground">Your interactive preview will appear here once you save a flow.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className="flex min-h-0 flex-col overflow-hidden shadow-sm">
                    <div className="flex items-center gap-2 border-b bg-muted/20 px-3 py-2 shrink-0">
                      <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">Active node</span>
                      <select value={selectedNodeId || ''} onChange={e => { const v = e.target.value || null; setSelectedNodeId(v); bus.emit('node:select', { nodeId: v, source: 'toolbar' }) }} className="flex-1 rounded-md border bg-background px-2 py-1 text-xs">
                        <option value="">Global theme</option>
                        {campaignNodes.map(n => (
                          <option key={n.id} value={n.id}>{n.type.replace(/_/g, ' ')} · {n.id.slice(0,4)}</option>
                        ))}
                      </select>
                      {selectedNode && <Badge variant="outline" className="font-mono text-[10px]">{selectedNode.type.replace(/_/g,' ')}</Badge>}
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-3 scrollbar-thin">
                      {selectedNode ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold capitalize">{selectedNode.type.replace(/_/g,' ')}</h3>
                            <Badge variant="outline" className="font-mono text-[10px]">{selectedNode.id.slice(0,6)}</Badge>
                          </div>
                          <StyleConfigRouter type={selectedNode.type} style={nodeStyles[selectedNode.id] || {}} onChange={(k,v)=> updateNodeStyle(k,v)} theme={theme} config={selectedNode.config} onConfigChange={updateNodeConfig} />
                          <Button variant="outline" size="sm" onClick={() => { setNodeOverrides(prev => { const n={...prev}; delete n[selectedNode.id]; return n}); setNodeStyles(prev => { const n={...prev}; delete n[selectedNode.id]; return n}) }} className="w-full gap-2">Reset node style</Button>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedNodeId(null); bus.emit('node:select', { nodeId: null, source: 'toolbar' }) }} className="w-full">Close</Button>
                        </div>
                      ) : (
                        <GlobalThemeEditor theme={theme} updateTheme={updateTheme} />
                      )}
                    </div>
                    <div className="border-t p-2 bg-muted/10 flex items-center gap-2">
                      <Button size="sm" onClick={() => persistStyledGraph().catch(()=>undefined)} className="flex-1 gap-1.5"><Save className="h-3.5 w-3.5" /> Save styles</Button>
                      <span className="text-[10px] text-muted-foreground">Auto-saves</span>
                    </div>
                  </Card>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-2">
                <Card className="border-border/60 shadow-soft">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <StatusPill kind="info">Step 4</StatusPill>
                      <StatusPill kind="muted">RAG sources</StatusPill>
                    </div>
                    <CardTitle className="text-xl">Train campaign knowledge</CardTitle>
                    <CardDescription>
                      When a customer leaves the configured journey or asks an unanswered question, the AI can retrieve from the approved campaign material below.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-3">
                      <KnowledgeCard
                        icon={<Globe className="h-3.5 w-3.5" />}
                        title="Website source"
                        description="Ingest a public URL to seed retrieval-augmented answers."
                        footer={
                          <div className="flex gap-1.5">
                            <Input
                              value={website}
                              onChange={e => setWebsite(e.target.value)}
                              placeholder="https://example.com/offer"
                              className="h-8 flex-1 text-xs"
                            />
                            <Button onClick={ingestWebsite} size="sm" className="h-8">
                              Train
                            </Button>
                          </div>
                        }
                      />
                      <KnowledgeCard
                        icon={<Upload className="h-3.5 w-3.5" />}
                        title="PDF document"
                        description="Upload a campaign PDF to chunk into the retrieval index."
                        footer={
                          <label className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed bg-muted/40 px-2 text-xs text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5">
                            <Upload className="h-3 w-3" />
                            <span>Choose PDF file</span>
                            <input
                              type="file"
                              accept="application/pdf"
                              onChange={e => ingestPdf(e.target.files?.[0])}
                              className="hidden"
                            />
                          </label>
                        }
                      />
                      <KnowledgeCard
                        icon={<MessageSquare className="h-3.5 w-3.5" />}
                        title="Approved Q&A"
                        description="Pin a question and answer pair to the knowledge base."
                        footer={
                          <div className="space-y-1.5">
                            <Input
                              value={question}
                              onChange={e => setQuestion(e.target.value)}
                              placeholder="What does delivery cost?"
                              className="h-8 text-xs"
                            />
                            <Textarea
                              value={answer}
                              onChange={e => setAnswer(e.target.value)}
                              placeholder="Provide the approved answer customers should receive."
                              className="min-h-[60px] text-xs"
                            />
                            <Button onClick={ingestQa} size="sm" className="h-8 w-full">
                              Train answer
                            </Button>
                          </div>
                        }
                      />
                    </div>
                  </CardContent>
                  {knowledgeStatus && (
                    <div className="px-3 pb-3">
                      <KnowledgeStatusBanner status={knowledgeStatus} />
                    </div>
                  )}
                </Card>

                <div className="flex justify-end">
                  <Button onClick={() => setStep(4)} className="gap-2">
                    Continue to publish
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-2">
                <Card className="border-border/60 shadow-soft">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <StatusPill kind="success">Final step</StatusPill>
                      <StatusPill kind="muted">Launch</StatusPill>
                    </div>
                    <CardTitle className="text-xl">Publish and share</CardTitle>
                    <CardDescription>
                      Publishing runs the journey validation gate before your campaign can be distributed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg',
                            journeys.length ? 'bg-amber-500/15 text-amber-700' : 'bg-muted text-muted-foreground',
                          )}>
                            <Layers className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Journey readiness</p>
                            <p className="text-[11px] text-muted-foreground">
                              {journeys.length
                                ? 'Your saved journey will be validated and marked published.'
                                : 'Return to the journey step and save a flow first.'}
                            </p>
                          </div>
                        </div>
                        <StatusPill kind={journeys.length ? 'warning' : 'muted'}>
                          {journeys.length ? journeys[0].status : 'No journey'}
                        </StatusPill>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        onClick={publish}
                        disabled={!journeys.length || publishing}
                        className="gap-2"
                      >
                        <Rocket className="h-4 w-4" />
                        {publishing ? 'Publishing…' : 'Publish campaign'}
                      </Button>
                      {publishStatus && <PublishStatusBanner status={publishStatus} />}
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-0 bg-foreground text-background shadow-elevated">
                  <div className="relative">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <StatusPill kind={isPublished ? "success" : "warning"}>
                          <span className="mr-1.5 inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                          {isPublished ? "Live" : "DEV preview"}
                        </StatusPill>
                        <span className="text-xs text-background/60">{isPublished ? "Product link" : "DEV preview link"}</span>
                      </div>
                      <CardTitle className="text-background">{isPublished ? "Share with your audience" : "Preview before publish"}</CardTitle>
                      <CardDescription className="text-background/60">
                        {isPublished ? "Your journey is published. This product link works for anyone and is ready for ads." : "Not published yet. This DEV link is unguessable, noindex, and works without publishing for internal review."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-1.5 rounded-lg border border-background/15 bg-background/10 p-1.5">
                        <Link2 className="ml-1.5 h-3.5 w-3.5 shrink-0 text-background/60" />
                        <code className="flex-1 truncate font-mono text-xs text-background/90">{shareLink}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copyShareLink}
                          className="h-7 shrink-0 text-background hover:bg-background/15 hover:text-background"
                        >
                          {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                        </Button>
                        <a
                          href={shareLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-background/80 transition-colors hover:bg-background/15 hover:text-background"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open
                        </a>
                      </div>
                      {isPublished && devLink && (
                        <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 p-1.5">
                          <span className="ml-1.5 text-[10px] font-mono text-white/60">DEV</span>
                          <code className="flex-1 truncate font-mono text-[11px] text-white/70">{devLink}</code>
                          <Button variant="ghost" size="sm" onClick={copyDevLink} className="h-6 shrink-0 text-white/70 hover:bg-white/10 hover:text-white text-xs">{devCopied ? "Copied" : "Copy DEV"}</Button>
                        </div>
                      )}
                      {!isPublished && (
                        <div className="text-[11px] text-white/50">Product link after publish will be <code className="font-mono text-white/70">{productLink}</code> (shows &#34;not live yet&#34; until you publish).</div>
                      )}
                    </CardContent>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function KnowledgeCard({
  icon, title, description, footer,
}: { icon: React.ReactNode; title: string; description: string; footer: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-lg border bg-card p-2.5 shadow-soft">
      <div className="flex items-center gap-1.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="mt-1.5 flex-1 text-xs text-muted-foreground">{description}</p>
      <div className="mt-2">{footer}</div>
    </div>
  )
}

function KnowledgeStatusBanner({ status }: { status: { kind: 'loading' | 'success' | 'error'; message: string } }) {
  const tone =
    status.kind === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
      : status.kind === 'error'
        ? 'border-destructive/30 bg-destructive/10 text-destructive'
        : 'border-primary/30 bg-primary/10 text-primary'
  const icon =
    status.kind === 'success' ? <CheckCircle2 className="h-4 w-4" />
    : status.kind === 'error' ? <HelpCircle className="h-4 w-4" />
    : <Circle className="h-4 w-4 animate-pulse" />
  return (
    <div className={cn('flex items-start gap-1.5 rounded-md border px-2 py-1.5 text-xs', tone)}>
      <span className="mt-0.5">{icon}</span>
      <span>{status.message}</span>
    </div>
  )
}

function PublishStatusBanner({ status }: { status: { kind: 'success' | 'error' | 'info'; message: string } }) {
  const tone =
    status.kind === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
      : status.kind === 'error'
        ? 'border-destructive/30 bg-destructive/10 text-destructive'
        : 'border-primary/30 bg-primary/10 text-primary'
  return (
    <div className={cn('flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs', tone)}>
      {status.kind === 'success' && <CheckCircle2 className="h-4 w-4" />}
      {status.kind === 'error' && <HelpCircle className="h-4 w-4" />}
      {status.kind === 'info' && <Circle className="h-4 w-4 animate-pulse" />}
      <span>{status.message}</span>
    </div>
  )
}

function ColorField({
  label, value, onChange, hint,
}: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium capitalize text-muted-foreground">{label}</span>
        <span className="font-mono text-[10px] text-muted-foreground">{value}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative h-9 w-12 shrink-0 overflow-hidden rounded-md border">
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer border-0 bg-transparent p-0"
          />
        </div>
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#000000"
          className="h-9 font-mono text-xs"
        />
      </div>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function GlobalThemeEditor({ theme, updateTheme }: { theme: Theme; updateTheme: (k: keyof Theme, v: string | number) => void }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Palette className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Global theme</h3>
          <p className="text-xs text-muted-foreground">Default style applied to every node.</p>
        </div>
      </div>

      <Separator className="my-5" />

      <div className="grid grid-cols-2 gap-3">
        {(['primary', 'accent', 'surface', 'foreground'] as const).map(key => (
          <ColorField
            key={key}
            label={key}
            value={theme[key]}
            onChange={v => updateTheme(key, v)}
          />
        ))}
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">Corner radius</span>
          <span className="font-mono text-[10px] text-muted-foreground">{theme.radius}px</span>
        </div>
        <Slider
          min={0}
          max={32}
          value={theme.radius}
          onChange={e => updateTheme('radius', Number(e.target.value))}
        />
      </div>

      <div className="mt-5 space-y-2">
        <Label htmlFor="cta-label" className="text-xs">Default CTA label</Label>
        <Input
          id="cta-label"
          value={theme.cta}
          onChange={e => updateTheme('cta', e.target.value)}
          placeholder="Explore the collection"
          className="h-9"
        />
      </div>

      <div className="mt-5 rounded-lg border bg-muted/30 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Preview</p>
        <div
          className="flex items-center justify-center p-6 text-center"
          style={{ background: theme.surface, color: theme.foreground, borderRadius: `${theme.radius}px` }}
        >
          <div>
            <div className="text-base font-semibold" style={{ color: theme.primary }}>Your brand lives here.</div>
            <div className="mt-1 text-xs opacity-70">A small preview of the global theme.</div>
            <div
              className="mx-auto mt-3 inline-block px-3 py-1 text-xs font-medium"
              style={{ background: theme.accent, color: theme.surface, borderRadius: `${theme.radius}px` }}
            >
              {theme.cta}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
