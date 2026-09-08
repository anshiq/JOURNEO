import type { JourneyGraph, Screen } from './journeyGraph'
import { getDefinition } from '../nodes/_core/registry'

export const FLOW_TYPES = new Set(['trigger', 'condition', 'end'])
export const VALUE_TYPES = new Set(['input', 'select', 'checkbox', 'rating', 'quiz', 'form'])
export const STRICT_VALUE_TYPES = new Set(['input', 'select', 'checkbox', 'rating'])

export function isFlowType(type: string): boolean {
  return FLOW_TYPES.has(type)
}

export function isRenderableType(type: string): boolean {
  const def = getDefinition(type) as any
  if (def && typeof def.renderable === 'boolean') return def.renderable
  return !FLOW_TYPES.has(type)
}

export function isValueType(type: string): boolean {
  const def = getDefinition(type) as any
  if (def && typeof def.valueType === 'boolean') return def.valueType
  return VALUE_TYPES.has(type)
}

export function blockOwnsExit(type: string, config: any): boolean {
  return Boolean((config || {}).blockOwnsExit)
}

export function registryExitHandles(type: string, config?: any): string[] {
  const def = getDefinition(type) as any
  if (type === 'condition') return ['true', 'false']
  if (type === 'quiz') return ['answered', 'skipped']
  if (type === 'video') return ['watched', 'skipped']
  if (type === 'card') {
    const actions = (config || {}).actions
    if (Array.isArray(actions) && actions.length > 0) {
      const out = actions.map((a: any, i: number) => (a && typeof a.handle === 'string' && a.handle ? a.handle : `action-${i}`))
      return out.length > 0 ? out : ['default']
    }
    return ['default']
  }
  if (type === 'hero_section') {
    const ctas = (config || {}).ctas
    if (Array.isArray(ctas) && ctas.length > 0) {
      const out = ctas.map((c: any, i: number) => (c && typeof c.handle === 'string' && c.handle ? c.handle : `cta-${i}`))
      return out.length > 0 ? out : ['default']
    }
    return ['default']
  }
  if (def && Array.isArray(def.exitHandles) && def.exitHandles.length > 0) return def.exitHandles
  if (def?.handles && Array.isArray(def.handles.outputs) && def.handles.outputs.length > 0) return def.handles.outputs
  return ['default']
}

export function defaultLayout(): Screen['layout'] {
  return { mode: 'stack', direction: 'column', gap: '12px', padding: '0px', align: 'stretch', justify: 'start', scroll: 'auto' }
}

export function defaultAdvance(): Screen['advance'] {
  return { mode: 'button', handle: 'default', label: '', position: 'bottom-sticky', variant: 'solid', fullWidth: true, requireValid: true, requireBlocks: [] }
}

export function defaultScreen(partial?: Partial<Screen>): Screen {
  const id = partial?.id || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `s-${Math.random().toString(36).slice(2)}`)
  return {
    id,
    name: partial?.name || 'Screen',
    position: partial?.position || { x: 80, y: 80 },
    size: partial?.size || { width: 320, height: 420 },
    blocks: partial?.blocks || [],
    layout: partial?.layout || defaultLayout(),
    style: partial?.style,
    theme: partial?.theme,
    advance: partial?.advance || defaultAdvance(),
    back: partial?.back || { show: false, label: 'Back' },
    timeoutSeconds: partial?.timeoutSeconds,
    askAi: partial?.askAi,
  }
}

export function advanceLabel(screen: Screen, graphThemeCta?: string): string {
  const l = (screen.advance.label || '').trim()
  if (l) return l
  if (graphThemeCta && graphThemeCta.trim()) return graphThemeCta
  return 'Continue'
}

export function backLabel(screen: Screen): string {
  const l = (screen.back.label || '').trim()
  return l || 'Back'
}

export interface ComputedExit {
  handle: string
  label: string
  source: 'advance' | 'block'
  blockId?: string
}

export function screenExits(graph: JourneyGraph, screen: Screen): ComputedExit[] {
  const outs = graph.edges.filter(e => e.source === screen.id)
  const byHandle = new Map<string, (typeof outs)[number]>()
  for (const e of outs) byHandle.set(e.sourceHandle || 'default', e)
  const exits: ComputedExit[] = []
  const nodeById = new Map(graph.nodes.map(n => [n.id, n]))
  if (screen.advance.mode === 'button' || screen.advance.mode === 'auto') {
    const h = screen.advance.handle || 'default'
    const edge = byHandle.get(h)
    if (edge) exits.push({ handle: h, label: edge.label || humanLabel(h), source: 'advance' })
  }
  for (const nodeId of screen.blocks) {
    const node = nodeById.get(nodeId)
    if (!node) continue
    if (!blockOwnsExit(node.type, node.config)) continue
    for (const h of registryExitHandles(node.type, node.config)) {
      const namespaced = `${nodeId}:${h}`
      const edge = byHandle.get(namespaced)
      if (edge) exits.push({ handle: namespaced, label: edge.label || humanLabel(h), source: 'block', blockId: nodeId })
    }
  }
  return exits
}

export function humanLabel(handle: string): string {
  if (!handle || handle === 'default') return 'Continue'
  const tail = handle.includes(':') ? handle.split(':').pop() || handle : handle
  if (!tail || tail === 'default') return 'Continue'
  return tail.replace(/_/g, ' ').replace(/-/g, ' ').trim().replace(/^\w/, c => c.toUpperCase())
}

export function evalVisibleWhen(rule: any, values: Record<string, any>, profile: Record<string, any>): boolean {
  if (!rule || typeof rule !== 'object') return true
  const field = rule.field
  const op = rule.operator
  if (!field || !op) return true
  const scope = { ...(profile || {}), ...(values || {}) }
  const pv = scope[field]
  const val = rule.value
  return evalOperator(pv, op, val)
}

function evalOperator(pv: any, op: string, val: any): boolean {
  const ps = pv === undefined || pv === null ? '' : String(pv)
  const vs = val === undefined || val === null ? '' : String(val)
  if (op === 'eq') return ps === vs
  if (op === 'neq') return ps !== vs
  if (op === 'contains') return ps.includes(vs)
  const a = Number(ps)
  const b = Number(vs)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false
  if (op === 'gt') return a > b
  if (op === 'lt') return a < b
  if (op === 'gte') return a >= b
  if (op === 'lte') return a <= b
  return false
}

export function collectPayload(values: Record<string, any>, extra?: Record<string, any>): Record<string, any> {
  return { ...(values || {}), ...(extra || {}) }
}

export function seedBlockKey(): string {
  const hex = Math.random().toString(16).slice(2, 6).padEnd(4, '0')
  return `field_${hex}`
}
