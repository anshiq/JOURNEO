import type { Node, Edge } from 'reactflow'
import { isKnownNodeType } from '../nodes/_core/helpers'
import { migratePrunedType } from '../nodes/_core/prune'
import type { NodeStyle, ThemeConfig } from '../nodes/_core/types'

export interface GraphNode {
  id: string
  type: string
  label?: string
  position: { x: number; y: number }
  config: Record<string, any> & { style?: NodeStyle; theme?: Partial<ThemeConfig> }
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  label?: string
}

export interface JourneyGraph {
  schemaVersion: 2
  theme: ThemeConfig
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export const DEFAULT_THEME: ThemeConfig = { primary: '#4f46e5', accent: '#f97316', surface: '#ffffff', foreground: '#111827', font: 'Inter', radius: 16, cta: 'Explore the collection' }

export class GraphParseError extends Error {}

export function emptyGraph(): JourneyGraph {
  return { schemaVersion: 2, theme: { ...DEFAULT_THEME }, nodes: [], edges: [] }
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
  if (!Array.isArray(raw.nodes)) throw new GraphParseError('graph.nodes must be an array')
  const edgesRaw = Array.isArray(raw.edges) ? raw.edges : []
  const legacyStyles = raw.nodeStyles && typeof raw.nodeStyles === 'object' ? raw.nodeStyles : {}
  const legacyOverrides = raw.nodeOverrides && typeof raw.nodeOverrides === 'object' ? raw.nodeOverrides : {}
  const nodes: GraphNode[] = raw.nodes.map((n: any) => {
    let type = String(n?.type || '')
    if (type && !isKnownNodeType(type)) type = migratePrunedType(type)
    const config: Record<string, any> = (n?.config && typeof n.config === 'object') ? { ...n.config } : {}
    const legacyStyle = legacyStyles[n?.id]
    const legacyTheme = legacyOverrides[n?.id]
    if (legacyStyle && typeof legacyStyle === 'object' && !config.style) config.style = legacyStyle
    if (legacyTheme && typeof legacyTheme === 'object' && !config.theme) config.theme = legacyTheme
    const position = (n?.position && typeof n.position.x === 'number' && typeof n.position.y === 'number')
      ? { x: n.position.x, y: n.position.y }
      : { x: 0, y: 0 }
    return {
      id: String(n?.id ?? ''),
      type,
      label: typeof n?.label === 'string' ? n.label : undefined,
      position,
      config,
    }
  })
  const edges: GraphEdge[] = edgesRaw.map((e: any, i: number) => ({
    id: String(e?.id ?? `e-${i}`),
    source: String(e?.source ?? ''),
    target: String(e?.target ?? ''),
    sourceHandle: typeof e?.sourceHandle === 'string' ? e.sourceHandle : undefined,
    label: typeof e?.label === 'string' ? e.label : undefined,
  }))
  const theme: ThemeConfig = { ...DEFAULT_THEME, ...(raw.theme && typeof raw.theme === 'object' ? raw.theme : {}) }
  return { schemaVersion: 2, theme, nodes, edges }
}

export function serializeGraph(g: JourneyGraph): string {
  return JSON.stringify({ schemaVersion: 2, theme: g.theme, nodes: g.nodes, edges: g.edges })
}

export function toFlow(g: JourneyGraph): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = g.nodes.map(n => ({
    id: n.id,
    type: 'journeyNode',
    position: n.position,
    data: { label: n.label, type: n.type, config: n.config },
  }))
  const edges: Edge[] = g.edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    label: e.label,
    animated: true,
    style: { strokeWidth: 2, stroke: '#94a3b8' },
  }))
  return { nodes, edges }
}

export function fromFlow(nodes: Node[], edges: Edge[], theme: ThemeConfig): JourneyGraph {
  return {
    schemaVersion: 2,
    theme,
    nodes: nodes.map(n => ({
      id: n.id,
      type: String((n.data as any)?.type || 'text'),
      label: (n.data as any)?.label,
      position: n.position,
      config: (n.data as any)?.config && typeof (n.data as any).config === 'object' ? (n.data as any).config : {},
    })),
    edges: edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || undefined,
      label: typeof e.label === 'string' ? e.label : undefined,
    })),
  }
}

export interface NodePatch {
  config?: Record<string, any>
  style?: Partial<NodeStyle> | null
  theme?: Partial<ThemeConfig> | null
}

export function patchNode(g: JourneyGraph, nodeId: string, patch: NodePatch): JourneyGraph {
  return {
    ...g,
    nodes: g.nodes.map(n => {
      if (n.id !== nodeId) return n
      const config: Record<string, any> = { ...n.config, ...(patch.config || {}) }
      if (patch.style === null) delete config.style
      else if (patch.style) config.style = { ...(n.config.style || {}), ...patch.style }
      if (patch.theme === null) delete config.theme
      else if (patch.theme) config.theme = { ...(n.config.theme || {}), ...patch.theme }
      return { ...n, config }
    }),
  }
}

export function resetNodeStyle(g: JourneyGraph, nodeId: string): JourneyGraph {
  return {
    ...g,
    nodes: g.nodes.map(n => {
      if (n.id !== nodeId) return n
      const config = { ...n.config }
      delete config.style
      delete config.theme
      return { ...n, config }
    }),
  }
}

export function effectiveTheme(g: JourneyGraph, nodeId: string | null): ThemeConfig {
  const node = nodeId ? g.nodes.find(n => n.id === nodeId) : undefined
  const override = node?.config?.theme || {}
  const out: any = { ...g.theme }
  for (const k of Object.keys(override)) {
    const v = (override as any)[k]
    if (v !== undefined) out[k] = v
  }
  return out as ThemeConfig
}

export function hasContent(g: JourneyGraph): boolean {
  return g.nodes.length > 0
}
