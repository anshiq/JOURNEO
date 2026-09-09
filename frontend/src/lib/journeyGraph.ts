import type { Node, Edge } from 'reactflow'
import { isKnownNodeType } from '../nodes/_core/helpers'
import type { NodeStyle, ThemeConfig } from '../nodes/_core/types'
import { defaultAdvance, defaultLayout } from './screen'

export interface GraphNode {
  id: string
  type: string
  label?: string
  position: { x: number; y: number }
  config: Record<string, any> & { style?: NodeStyle }
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  label?: string
}

export interface ScreenLayout {
  mode: 'stack' | 'grid'
  direction: 'column' | 'row'
  gap: string
  padding: string
  align: 'start' | 'center' | 'end' | 'stretch'
  justify: 'start' | 'center' | 'end' | 'between' | 'around'
  columns?: number
  maxWidth?: string
  scroll: 'auto' | 'hidden' | 'paged'
}

export type AdvanceMode = 'button' | 'block' | 'auto' | 'none'

export interface ScreenAdvance {
  mode: AdvanceMode
  handle: string
  label: string
  position: 'bottom-sticky' | 'inline-end' | 'top'
  variant: 'solid' | 'outline' | 'ghost'
  fullWidth: boolean
  requireValid: boolean
  requireBlocks: string[]
  disabledHint?: string
  gesture?: 'none' | 'swipe-up' | 'tap-anywhere'
}

export interface ScreenBack { show: boolean; label: string }

export interface Screen {
  id: string
  name: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  blocks: string[]
  layout: ScreenLayout
  theme?: Partial<ThemeConfig>
  style?: NodeStyle
  advance: ScreenAdvance
  back: ScreenBack
  timeoutSeconds?: number
}

export interface AskAiFixture {
  id: string
  placeholder: string
  buttonLabel: string
  refusalMessage: string
  ragK: number
  allowJourneyJump: boolean
  allowRag: boolean
  answerStyle: 'thread' | 'single'
  persistence: 'session' | 'screen' | 'ephemeral'
  pinnedPanel: boolean
  allowPin: boolean
  allowAdjust: boolean
  maxConcurrentQueries: number
  historyLimit: number
}

export interface JourneyGraph {
  schemaVersion: 3
  theme: ThemeConfig
  screens: Screen[]
  nodes: GraphNode[]
  edges: GraphEdge[]
  askAi: AskAiFixture | null
}

export const DEFAULT_THEME: ThemeConfig = { primary: '#4f46e5', accent: '#f97316', surface: '#ffffff', foreground: '#111827', font: 'Inter', radius: 16, cta: 'Explore the collection' }
export const EDITORIAL_THEME: ThemeConfig = { primary: '#000000', accent: '#E60000', surface: '#FFFFFF', foreground: '#111111', font: 'Bodoni Moda', radius: 0, cta: 'Explore the collection' }
export const THEME_PRESETS: Record<string, ThemeConfig> = { Classic: { ...DEFAULT_THEME }, Editorial: { ...EDITORIAL_THEME } }

export const FLOW_TYPES = new Set(['trigger', 'condition', 'end'])
export const FLOATING_TYPES = new Set(['ask_ai'])
export const SCREEN_CONTENT_TOP = 44
export const BLOCK_INSET_X = 12
export const BLOCK_GAP = 12
export const BLOCK_SLOT_H = 84
export const SCREEN_FOOTER_H = 48
export const SCREEN_MIN_H = 160
export function screenHeightForBlockCount(count: number): number {
  return Math.max(SCREEN_MIN_H, SCREEN_CONTENT_TOP + count * BLOCK_SLOT_H + SCREEN_FOOTER_H)
}

export function defaultAskAi(): AskAiFixture {
  return {
    id: 'ask-ai',
    placeholder: 'Ask anything...',
    buttonLabel: 'Ask',
    refusalMessage: 'This question is out of context.',
    ragK: 8,
    allowJourneyJump: true,
    allowRag: true,
    answerStyle: 'thread',
    persistence: 'session',
    pinnedPanel: true,
    allowPin: true,
    allowAdjust: true,
    maxConcurrentQueries: 3,
    historyLimit: 100,
  }
}

export function newScreenId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `s-${Math.random().toString(36).slice(2)}`
}

export function defaultScreenValues(): Screen {
  return {
    id: newScreenId(),
    name: 'Screen',
    position: { x: 80, y: 80 },
    size: { width: 320, height: 420 },
    blocks: [],
    layout: { ...defaultLayout() },
    advance: { ...defaultAdvance() },
    back: { show: false, label: 'Back' },
  }
}

export class GraphParseError extends Error {}

export function emptyGraph(): JourneyGraph {
  return { schemaVersion: 3, theme: { ...DEFAULT_THEME }, screens: [], nodes: [], edges: [], askAi: defaultAskAi() }
}

function asPosition(p: any): { x: number; y: number } {
  if (p && typeof p.x === 'number' && typeof p.y === 'number') return { x: p.x, y: p.y }
  return { x: 0, y: 0 }
}

function asSize(s: any): { width: number; height: number } {
  if (s && typeof s.width === 'number' && typeof s.height === 'number') return { width: s.width, height: s.height }
  return { width: 320, height: 420 }
}

export function parseGraph(graphJson: string | null | undefined): JourneyGraph {
  if (!graphJson || !graphJson.trim()) return emptyGraph()
  let raw: any
  try {
    raw = JSON.parse(graphJson)
  } catch {
    throw new GraphParseError('graph is not valid JSON')
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new GraphParseError('graph must be an object')
  if (raw.schemaVersion !== 3) throw new GraphParseError('Unsupported graph schema, rebuild the journey')
  if (!Array.isArray(raw.nodes)) throw new GraphParseError('graph.nodes must be an array')
  if (!Array.isArray(raw.screens)) throw new GraphParseError('graph.screens must be an array')
  const edgesRaw = Array.isArray(raw.edges) ? raw.edges : []
  const nodes: GraphNode[] = raw.nodes.map((n: any) => {
    const type = String(n?.type || '')
    if (type && !isKnownNodeType(type)) throw new GraphParseError(`Unknown node type: ${type}`)
    const config: Record<string, any> = (n?.config && typeof n.config === 'object') ? { ...n.config } : {}
    delete (config as any).theme
    delete (config as any).showContinueButton
    delete (config as any).continueLabel
    delete (config as any).showBackButton
    delete (config as any).backLabel
    delete (config as any).timeoutSeconds
    return {
      id: String(n?.id ?? ''),
      type,
      label: typeof n?.label === 'string' ? n.label : undefined,
      position: asPosition(n?.position),
      config,
    }
  })
  const screens: Screen[] = raw.screens.map((s: any, i: number) => ({
    id: String(s?.id ?? `s-${i}`),
    name: typeof s?.name === 'string' ? s.name : `Screen ${i + 1}`,
    position: asPosition(s?.position),
    size: asSize(s?.size),
    blocks: Array.isArray(s?.blocks) ? s.blocks.map((b: any) => String(b)) : [],
    layout: {
      mode: s?.layout?.mode === 'grid' ? 'grid' : 'stack',
      direction: s?.layout?.direction === 'row' ? 'row' : 'column',
      gap: typeof s?.layout?.gap === 'string' ? s.layout.gap : '12px',
      padding: typeof s?.layout?.padding === 'string' ? s.layout.padding : '0px',
      align: s?.layout?.align || 'stretch',
      justify: s?.layout?.justify || 'start',
      columns: typeof s?.layout?.columns === 'number' ? s.layout.columns : undefined,
      maxWidth: typeof s?.layout?.maxWidth === 'string' ? s.layout.maxWidth : undefined,
      scroll: s?.layout?.scroll === 'hidden' || s?.layout?.scroll === 'paged' ? s.layout.scroll : 'auto',
    },
    theme: s?.theme && typeof s.theme === 'object' ? s.theme : undefined,
    style: s?.style && typeof s.style === 'object' ? s.style : undefined,
    advance: {
      mode: s?.advance?.mode === 'block' || s?.advance?.mode === 'auto' || s?.advance?.mode === 'none' ? s.advance.mode : 'button',
      handle: typeof s?.advance?.handle === 'string' && s.advance.handle ? s.advance.handle : 'default',
      label: typeof s?.advance?.label === 'string' ? s.advance.label : '',
      position: s?.advance?.position || 'bottom-sticky',
      variant: s?.advance?.variant || 'solid',
      fullWidth: s?.advance?.fullWidth !== false,
      requireValid: s?.advance?.requireValid !== false,
      requireBlocks: Array.isArray(s?.advance?.requireBlocks) ? s.advance.requireBlocks.map((b: any) => String(b)) : [],
      disabledHint: typeof s?.advance?.disabledHint === 'string' ? s.advance.disabledHint : undefined,
      gesture: s?.advance?.gesture || undefined,
    },
    back: { show: Boolean(s?.back?.show), label: typeof s?.back?.label === 'string' ? s.back.label : 'Back' },
    timeoutSeconds: typeof s?.timeoutSeconds === 'number' ? s.timeoutSeconds : undefined,
  }))
  const edges: GraphEdge[] = edgesRaw.map((e: any, i: number) => ({
    id: String(e?.id ?? `e-${i}`),
    source: String(e?.source ?? ''),
    target: String(e?.target ?? ''),
    sourceHandle: typeof e?.sourceHandle === 'string' ? e.sourceHandle : undefined,
    label: typeof e?.label === 'string' ? e.label : undefined,
  }))
  const theme: ThemeConfig = { ...DEFAULT_THEME, ...(raw.theme && typeof raw.theme === 'object' ? raw.theme : {}) }
  let askAi: AskAiFixture | null = null
  if (raw.askAi && typeof raw.askAi === 'object') {
    const d = defaultAskAi()
    askAi = { ...d, ...raw.askAi, id: typeof raw.askAi.id === 'string' ? raw.askAi.id : d.id }
  } else if (Object.prototype.hasOwnProperty.call(raw, 'askAi')) {
    askAi = null
  } else {
    askAi = defaultAskAi()
  }
  return { schemaVersion: 3, theme, screens, nodes, edges, askAi }
}

export function serializeGraph(g: JourneyGraph): string {
  return JSON.stringify({ schemaVersion: 3, theme: g.theme, screens: g.screens, nodes: g.nodes, edges: g.edges, askAi: g.askAi })
}

export function blockOwnerIndex(g: JourneyGraph): Map<string, string> {
  const m = new Map<string, string>()
  for (const s of g.screens) for (const b of s.blocks) m.set(b, s.id)
  return m
}

export function mergedScreenTheme(g: JourneyGraph, screenId: string | null): ThemeConfig {
  const out: any = { ...g.theme }
  if (!screenId) return out as ThemeConfig
  const s = g.screens.find(x => x.id === screenId)
  const over = s?.theme || {}
  for (const k of Object.keys(over)) {
    const v = (over as any)[k]
    if (v !== undefined) out[k] = v
  }
  return out as ThemeConfig
}

export function toFlow(g: JourneyGraph): { nodes: Node[]; edges: Edge[] } {
  const out: Node[] = []
  for (const s of g.screens) {
    const exits = s.advance.mode === 'button' || s.advance.mode === 'auto' ? [s.advance.handle || 'default'] : []
    const fittedH = Math.max(s.size.height, screenHeightForBlockCount(s.blocks.length))
    const fittedSize = { width: s.size.width, height: fittedH }
    out.push({
      id: s.id,
      type: 'screenNode',
      position: s.position,
      style: { width: fittedSize.width, height: fittedH },
      data: { screen: { ...s, size: fittedSize }, exits, blockCount: s.blocks.length },
    })
  }
  const owner = blockOwnerIndex(g)
  const nodeById = new Map(g.nodes.map(n => [n.id, n]))
  for (const s of g.screens) {
    s.blocks.forEach((bid, i) => {
      const n = nodeById.get(bid)
      if (!n) return
      out.push({
        id: n.id,
        type: 'journeyNode',
        parentNode: s.id,
        position: { x: BLOCK_INSET_X, y: SCREEN_CONTENT_TOP + i * BLOCK_SLOT_H },
        draggable: true,
        data: { label: n.label, type: n.type, config: n.config, blockIndex: i, screenId: s.id, isBlock: true }
      })
    })
  }
  for (const n of g.nodes) {
    if (owner.has(n.id)) continue
    if (FLOATING_TYPES.has(n.type)) {
      out.push({
        id: n.id,
        type: 'flowNode',
        position: n.position,
        draggable: true,
        data: { label: n.label, type: n.type, config: n.config, isFloating: true },
      })
      continue
    }
    if (!FLOW_TYPES.has(n.type)) continue
    out.push({
      id: n.id,
      type: 'flowNode',
      position: n.position,
      data: { label: n.label, type: n.type, config: n.config },
    })
  }
  const edges: Edge[] = g.edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    label: e.label,
    animated: true,
    style: { strokeWidth: 2, stroke: '#94a3b8' },
  }))
  return { nodes: out, edges }
}

export function fromFlow(nodes: Node[], edges: Edge[], theme: ThemeConfig, prevScreens?: Screen[], prevAskAi?: AskAiFixture | null): JourneyGraph {
  const prevScreenById = new Map<string, Screen>()
  for (const s of prevScreens || []) prevScreenById.set(s.id, s)
  const screenById = new Map<string, Screen>()
  for (const n of nodes) {
    if (n.type === 'screenNode') {
      const d = (n.data || {}) as any
      const prev = prevScreenById.get(n.id)
      const s: Screen = {
        id: n.id,
        name: d.screen?.name || prev?.name || 'Screen',
        position: n.position,
        size: { width: (n as any).width || (n.style as any)?.width || d.screen?.size?.width || prev?.size?.width || 320, height: (n as any).height || (n.style as any)?.height || d.screen?.size?.height || prev?.size?.height || 420 },
        blocks: [],
        layout: d.screen?.layout || prev?.layout || { mode: 'stack', direction: 'column', gap: '12px', padding: '0px', align: 'stretch', justify: 'start', scroll: 'auto' },
        theme: d.screen?.theme ?? prev?.theme,
        style: d.screen?.style ?? prev?.style,
        advance: d.screen?.advance || prev?.advance || { mode: 'button', handle: 'default', label: '', position: 'bottom-sticky', variant: 'solid', fullWidth: true, requireValid: true, requireBlocks: [] },
        back: d.screen?.back || prev?.back || { show: false, label: 'Back' },
        timeoutSeconds: d.screen?.timeoutSeconds ?? prev?.timeoutSeconds,
      }
      screenById.set(n.id, s)
    }
  }
  const children: { id: string; parent: string | undefined; y: number; type: string; label: any; config: any; position: any }[] = []
  for (const n of nodes) {
    if (n.type !== 'journeyNode') continue
    const d = (n.data || {}) as any
    children.push({ id: n.id, parent: (n as any).parentNode, y: n.position?.y ?? 0, type: String(d.type || 'text'), label: d.label, config: d.config && typeof d.config === 'object' ? d.config : {}, position: n.position })
  }
  const byParent = new Map<string, typeof children>()
  for (const c of children) {
    if (!c.parent || !screenById.has(c.parent)) continue
    if (!byParent.has(c.parent)) byParent.set(c.parent, [])
    byParent.get(c.parent)!.push(c)
  }
  for (const [pid, list] of byParent) {
    list.sort((a, b) => a.y - b.y)
    screenById.get(pid)!.blocks = list.map(c => c.id)
  }
  const graphNodes: GraphNode[] = []
  for (const c of children) {
    if (!c.parent || !screenById.has(c.parent)) {
      const s = defaultScreenValues()
      s.blocks = [c.id]
      s.position = { x: Math.max(0, (c.position?.x ?? 80) - 12), y: Math.max(0, (c.position?.y ?? 80) - 44) }
      screenById.set(s.id, s)
    }
    graphNodes.push({ id: c.id, type: c.type, label: c.label, position: { x: 0, y: 0 }, config: c.config })
  }
  for (const n of nodes) {
    if (n.type !== 'flowNode') continue
    const d = (n.data || {}) as any
    graphNodes.push({ id: n.id, type: String(d.type || 'trigger'), label: d.label, position: n.position, config: d.config && typeof d.config === 'object' ? d.config : {} })
  }
  return {
    schemaVersion: 3,
    theme,
    screens: [...screenById.values()],
    nodes: graphNodes,
    edges: edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || undefined,
      label: typeof e.label === 'string' ? e.label : undefined,
    })),
    askAi: prevAskAi !== undefined ? prevAskAi : defaultAskAi(),
  }
}

export interface NodePatch {
  config?: Record<string, any>
  style?: Partial<NodeStyle> | null
}

export function patchNode(g: JourneyGraph, nodeId: string, patch: NodePatch): JourneyGraph {
  return {
    ...g,
    nodes: g.nodes.map(n => {
      if (n.id !== nodeId) return n
      const config: Record<string, any> = { ...n.config, ...(patch.config || {}) }
      if (patch.style === null) delete config.style
      else if (patch.style) config.style = { ...(n.config.style || {}), ...patch.style }
      return { ...n, config }
    }),
  }
}

export function patchScreen(g: JourneyGraph, screenId: string, patch: Partial<Screen>): JourneyGraph {
  return { ...g, screens: g.screens.map(s => (s.id === screenId ? { ...s, ...patch } : s)) }
}

export function addScreen(g: JourneyGraph, screen?: Partial<Screen>): JourneyGraph {
  const s: Screen = {
    id: screen?.id || newScreenId(),
    name: screen?.name || `Screen ${g.screens.length + 1}`,
    position: screen?.position || { x: 80 + g.screens.length * 40, y: 80 + g.screens.length * 40 },
    size: screen?.size || { width: 320, height: 420 },
    blocks: screen?.blocks || [],
    layout: screen?.layout || { mode: 'stack', direction: 'column', gap: '12px', padding: '0px', align: 'stretch', justify: 'start', scroll: 'auto' },
    theme: screen?.theme,
    style: screen?.style,
    advance: screen?.advance || { mode: 'button', handle: 'default', label: '', position: 'bottom-sticky', variant: 'solid', fullWidth: true, requireValid: true, requireBlocks: [] },
    back: screen?.back || { show: false, label: 'Back' },
    timeoutSeconds: screen?.timeoutSeconds,
  }
  return { ...g, screens: [...g.screens, s] }
}

export function removeScreen(g: JourneyGraph, screenId: string): JourneyGraph {
  const s = g.screens.find(x => x.id === screenId)
  if (!s) return g
  const dead = new Set(s.blocks)
  return {
    ...g,
    screens: g.screens.filter(x => x.id !== screenId),
    nodes: g.nodes.filter(n => !dead.has(n.id)),
    edges: g.edges.filter(e => e.source !== screenId && e.target !== screenId),
  }
}

export function groupIntoScreen(g: JourneyGraph, nodeIds: string[], screenName?: string): JourneyGraph {
  const ids = nodeIds.filter(id => g.nodes.some(n => n.id === id))
  if (ids.length === 0) return g
  for (const id of ids) {
    const n = g.nodes.find(x => x.id === id)
    if (n && (FLOW_TYPES.has(n.type) || FLOATING_TYPES.has(n.type))) return g
  }
  const owner = blockOwnerIndex(g)
  const touchedScreens = new Set<string>()
  for (const id of ids) {
    const o = owner.get(id)
    if (o) touchedScreens.add(o)
  }
  const ordered = [...g.nodes.filter(n => ids.includes(n.id))].sort((a, b) => a.position.y - b.position.y)
  const s: Screen = {
    id: newScreenId(),
    name: screenName || 'Screen',
    position: { x: Math.min(...ordered.map(n => n.position.x)), y: Math.min(...ordered.map(n => n.position.y)) },
    size: { width: 320, height: 420 },
    blocks: ordered.map(n => n.id),
    layout: { mode: 'stack', direction: 'column', gap: '12px', padding: '0px', align: 'stretch', justify: 'start', scroll: 'auto' },
    advance: { mode: 'button', handle: 'default', label: '', position: 'bottom-sticky', variant: 'solid', fullWidth: true, requireValid: true, requireBlocks: [] },
    back: { show: false, label: 'Back' },
  }
  const idSet = new Set(ids)
  let screens = g.screens.map(sc => ({ ...sc, blocks: sc.blocks.filter(b => !idSet.has(b)) }))
  screens = screens.filter(sc => !touchedScreens.has(sc.id) || sc.blocks.length > 0)
  screens.push(s)
  const inEdges = g.edges.filter(e => idSet.has(e.target) && !idSet.has(e.source))
  const outEdges = g.edges.filter(e => idSet.has(e.source) && !idSet.has(e.target))
  const seen = new Set<string>()
  const rewired: GraphEdge[] = []
  for (const e of inEdges) {
    const key = `${e.source}->${s.id}->${e.sourceHandle || ''}`
    if (seen.has(key)) continue
    seen.add(key)
    rewired.push({ ...e, id: `e-${Math.random().toString(36).slice(2)}`, target: s.id })
  }
  for (const e of outEdges) {
    const blockId = e.source
    const sourceHandle = e.sourceHandle && e.sourceHandle.startsWith(`${blockId}:`) ? e.sourceHandle : 'default'
    const key = `${s.id}->${e.target}->${sourceHandle}`
    if (seen.has(key)) continue
    seen.add(key)
    rewired.push({ ...e, id: `e-${Math.random().toString(36).slice(2)}`, source: s.id, sourceHandle })
  }
  const keep = g.edges.filter(e => !(idSet.has(e.source) || idSet.has(e.target)))
  return { ...g, screens, edges: [...keep, ...rewired] }
}

export function ungroupScreen(g: JourneyGraph, screenId: string): JourneyGraph {
  const s = g.screens.find(x => x.id === screenId)
  if (!s) return g
  if (s.blocks.length <= 1) {
    const only = s.blocks[0]
    if (!only) return { ...g, screens: g.screens.filter(x => x.id !== screenId) }
    const solo: Screen = { ...s, name: s.name }
    return { ...g, screens: g.screens.map(x => (x.id === screenId ? solo : x)) }
  }
  const inEdges = g.edges.filter(e => e.target === screenId)
  const outEdges = g.edges.filter(e => e.source === screenId)
  const rest = g.edges.filter(e => e.source !== screenId && e.target !== screenId)
  const nodeById = new Map(g.nodes.map(n => [n.id, n]))
  const ordered = s.blocks.map(b => nodeById.get(b)).filter(Boolean) as GraphNode[]
  const newScreens: Screen[] = ordered.map((n, i) => ({
    id: newScreenId(),
    name: `${s.name} ${i + 1}`,
    position: { x: s.position.x + i * 40, y: s.position.y + i * 40 },
    size: { ...s.size },
    blocks: [n.id],
    layout: { ...s.layout },
    advance: { ...s.advance },
    back: { ...s.back },
  }))
  const chain: GraphEdge[] = []
  for (let i = 0; i < newScreens.length - 1; i++) {
    chain.push({ id: `e-${Math.random().toString(36).slice(2)}`, source: newScreens[i].id, target: newScreens[i + 1].id, sourceHandle: 'default' })
  }
  const first = newScreens[0].id
  const last = newScreens[newScreens.length - 1].id
  for (const e of inEdges) chain.push({ ...e, id: `e-${Math.random().toString(36).slice(2)}`, target: first })
  for (const e of outEdges) chain.push({ ...e, id: `e-${Math.random().toString(36).slice(2)}`, source: last })
  return { ...g, screens: [...g.screens.filter(x => x.id !== screenId), ...newScreens], edges: [...rest, ...chain] }
}

export function moveBlock(g: JourneyGraph, blockId: string, toScreenId: string, toIndex?: number): JourneyGraph {
  if (!g.screens.some(s => s.id === toScreenId)) return g
  if (!g.nodes.some(n => n.id === blockId)) return g
  const screens = g.screens.map(s => ({ ...s, blocks: s.blocks.filter(b => b !== blockId) }))
  const target = screens.find(s => s.id === toScreenId)!
  const idx = toIndex === undefined ? target.blocks.length : Math.max(0, Math.min(toIndex, target.blocks.length))
  target.blocks.splice(idx, 0, blockId)
  return { ...g, screens }
}

export function reorderBlocks(g: JourneyGraph, screenId: string, blocks: string[]): JourneyGraph {
  return { ...g, screens: g.screens.map(s => (s.id === screenId ? { ...s, blocks: [...blocks] } : s)) }
}

export function resetNodeStyle(g: JourneyGraph, nodeId: string): JourneyGraph {
  return {
    ...g,
    nodes: g.nodes.map(n => {
      if (n.id !== nodeId) return n
      const config = { ...n.config }
      delete config.style
      return { ...n, config }
    }),
  }
}

export function hasContent(g: JourneyGraph): boolean {
  return g.screens.length > 0 || g.nodes.length > 0
}
