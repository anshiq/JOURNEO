import { z } from 'zod'
import { allNodeTypes } from '../nodes/_core/registry'
import { validateNodeConfig } from '../nodes/_core/helpers'
import { STRICT_VALUE_TYPES } from './screen'

export const nodeSchema = z.object({ id: z.string(), type: z.enum(allNodeTypes as [string, ...string[]]), config: z.any().optional(), position: z.any().optional() })

export function validateGraph(input: any): any[] {
  const errs: any[] = []
  const g = input && typeof input === 'object' && Array.isArray(input.screens) ? input : null
  if (!g) {
    errs.push({ nodeId: 'graph', field: 'schemaVersion', message: 'Unsupported graph schema, rebuild the journey' })
    return errs
  }
  if ((g as any).schemaVersion !== 3) {
    errs.push({ nodeId: 'graph', field: 'schemaVersion', message: 'Unsupported graph schema, rebuild the journey' })
    return errs
  }
  const screens: any[] = Array.isArray(g.screens) ? g.screens : []
  const nodes: any[] = Array.isArray(g.nodes) ? g.nodes : []
  const edges: any[] = Array.isArray(g.edges) ? g.edges : []
  const nodeById = new Map(nodes.map(n => [n.id, n]))
  const owner = new Map<string, string>()
  for (const s of screens) {
    if (!Array.isArray(s.blocks)) {
      errs.push({ nodeId: s.id || 'graph', field: 'blocks', message: 'Screen blocks must be an array' })
      continue
    }
    if (s.blocks.length === 0) errs.push({ nodeId: s.id, field: 'blocks', message: 'Screen has no blocks' })
    for (const b of s.blocks) {
      if (owner.has(b)) errs.push({ nodeId: b, field: 'blocks', message: 'Block belongs to multiple screens' })
      else owner.set(b, s.id)
      if (!nodeById.has(b)) errs.push({ nodeId: s.id, field: 'blocks', message: `Screen references missing block ${b}` })
      else {
        const n = nodeById.get(b)
        if (n && ['trigger', 'condition', 'end'].includes(n.type)) errs.push({ nodeId: b, field: 'blocks', message: 'Flow node cannot be inside a screen' })
      }
    }
  }
  for (const n of nodes) {
    if (['trigger', 'condition', 'end'].includes(n.type)) continue
    if (!owner.has(n.id)) errs.push({ nodeId: n.id, field: 'blocks', message: 'Renderable block is not in any screen' })
  }
  const triggers = nodes.filter(n => n.type === 'trigger')
  if (triggers.length !== 1) errs.push({ nodeId: 'graph', field: 'trigger', message: `Exactly one trigger required, found ${triggers.length}` })
  const vertexIds = new Set([...screens.map(s => s.id), ...triggers.map(t => t.id), ...nodes.filter(n => ['condition', 'end'].includes(n.type)).map(n => n.id)])
  if (triggers.length === 1) {
    const adj = new Map<string, string[]>()
    edges.forEach(e => {
      if (!adj.has(e.source)) adj.set(e.source, [])
      adj.get(e.source)!.push(e.target)
    })
    const visited = new Set<string>([triggers[0].id])
    const q = [triggers[0].id]
    while (q.length) {
      const cur = q.shift()!
      for (const t of adj.get(cur) || []) {
        if (vertexIds.has(t) && !visited.has(t)) { visited.add(t); q.push(t) }
      }
    }
    for (const s of screens) {
      if (!visited.has(s.id)) errs.push({ nodeId: s.id, field: 'graph', message: 'Unreachable screen' })
    }
  }
  nodes.forEach(n => {
    const res = validateNodeConfig(n.type, n.config)
    if (!res.success) res.errors.forEach((msg: string) => errs.push({ nodeId: n.id, field: 'config', message: msg }))
    if (STRICT_VALUE_TYPES.has(n.type)) {
      const k = (n.config || {}).blockKey
      if (typeof k !== 'string' || !k) errs.push({ nodeId: n.id, field: 'config.blockKey', message: `${n.type} requires blockKey` })
    }
  })
  for (const s of screens) {
    const keys = new Map<string, string>()
    for (const b of s.blocks || []) {
      const n = nodeById.get(b)
      if (!n) continue
      const k = (n.config || {}).blockKey
      if (typeof k === 'string' && k) {
        if (keys.has(k)) errs.push({ nodeId: b, field: 'config.blockKey', message: `Duplicate blockKey ${k} in screen` })
        else keys.set(k, b)
      }
    }
    const mode = s.advance?.mode || 'button'
    const outs = edges.filter(e => e.source === s.id)
    if (mode === 'button' && outs.length === 0) errs.push({ nodeId: s.id, field: 'advance.mode', message: 'Button advance requires an outgoing edge' })
    if (mode === 'block') {
      const owned = (s.blocks || []).some((b: string) => Boolean((nodeById.get(b)?.config || {}).blockOwnsExit))
      if (!owned) errs.push({ nodeId: s.id, field: 'advance.mode', message: 'Block advance requires a block with blockOwnsExit' })
    }
    if (mode === 'none' && outs.length > 0) errs.push({ nodeId: s.id, field: 'advance.mode', message: 'Advance mode none should not have outgoing edges', severity: 'warning' })
    for (const r of s.advance?.requireBlocks || []) {
      if (!(s.blocks || []).includes(r)) errs.push({ nodeId: s.id, field: 'advance.requireBlocks', message: `requireBlocks references missing block ${r}` })
      else {
        const n = nodeById.get(r)
        if (!n || !(n.config || {}).blockKey) errs.push({ nodeId: s.id, field: 'advance.requireBlocks', message: `requireBlocks entry ${r} has no blockKey` })
      }
    }
  }
  edges.forEach(e => {
    if (!vertexIds.has(e.source) || !vertexIds.has(e.target)) errs.push({ nodeId: e.id, field: 'edges', message: 'Edge references missing vertex' })
    const sh = e.sourceHandle
    if (typeof sh === 'string' && sh.includes(':')) {
      const [bid] = sh.split(':')
      const srcScreen = screens.find(s => s.id === e.source)
      if (!srcScreen || !(srcScreen.blocks || []).includes(bid)) errs.push({ nodeId: e.id, field: 'edges', message: `Edge handle references block ${bid} outside source screen` })
    }
  })
  if (g.askAi && (g.askAi as any).scope === 'per-screen') {
    const anyEnabled = screens.some(s => s.askAi?.enabled)
    if (!anyEnabled) errs.push({ nodeId: 'graph', field: 'askAi.scope', message: 'per-screen scope has no enabled screen', severity: 'warning' })
  }
  const adj2 = new Map<string, any[]>()
  edges.forEach(e => {
    if (!adj2.has(e.source)) adj2.set(e.source, [])
    adj2.get(e.source)!.push(e)
  })
  if (hasCycle(adj2, vertexIds)) errs.push({ nodeId: 'graph', field: 'edges', message: 'Cycle detected outside subflow boundary' })
  return errs
}

function hasCycle(adj: Map<string, any[]>, ids: Set<string>): boolean {
  const state = new Map<string, number>()
  for (const n of ids) state.set(n, 0)
  const dfs = (u: string): boolean => {
    state.set(u, 1)
    for (const e of adj.get(u) || []) {
      const v = e.target
      if (!state.has(v)) continue
      if (state.get(v) === 1) return true
      if (state.get(v) === 0 && dfs(v)) return true
    }
    state.set(u, 2)
    return false
  }
  for (const n of ids) if (state.get(n) === 0 && dfs(n)) return true
  return false
}

export function validateGraphNodesEdges(nodes: any[], edges: any[]): any[] {
  return validateGraph({ schemaVersion: 3, theme: {}, screens: [], nodes, edges, askAi: null })
}
