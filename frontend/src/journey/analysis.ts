import type { JourneyDoc } from './model/types'
import { type Port, portsOf, screenOutputs } from './ports'
import { resolveTarget } from './targets'

export const INFINITY = 10 ** 9

export interface DocIndex {
  doc: JourneyDoc
  kinds: Record<string, string>
  ports: Record<string, Port[]>
  adjacency: Record<string, [string, string][]>
  reachable: Set<string>
  produced: Record<string, Set<string>>
  may: Record<string, Set<string>>
  must: Record<string, Set<string>>
  minToEnd: Record<string, number>
  sccs: string[][]
  hasReachableCycle: boolean
  firstStep: string
  order: Record<string, number>
}

export function indexTarget(index: DocIndex, stepId: string, port: string): string | null {
  return resolveTarget(index.doc, stepId, port)
}

export function firstScreen(index: DocIndex): string | null {
  let current = index.firstStep ? indexTarget(index, index.firstStep, 'next') : null
  const seen = new Set<string>()
  while (current && !seen.has(current)) {
    seen.add(current)
    const kind = index.kinds[current]
    if (kind === 'screen') return current
    if (kind !== 'condition') return null
    current =
      indexTarget(index, current, 'else') ??
      index.adjacency[current]?.map(([, target]) => target).find(target => target !== undefined) ??
      null
  }
  return null
}

function computeReachable(index: DocIndex): Set<string> {
  const seen = new Set<string>()
  const queue: string[] = index.firstStep ? [index.firstStep] : []
  while (queue.length > 0) {
    const current = queue.shift() as string
    if (seen.has(current)) continue
    seen.add(current)
    for (const [, target] of index.adjacency[current] ?? []) {
      if (!seen.has(target)) queue.push(target)
    }
  }
  return seen
}

function computeAvailability(index: DocIndex): void {
  const predecessors: Record<string, string[]> = {}
  for (const sid of Object.keys(index.kinds)) predecessors[sid] = []
  for (const [src, edges] of Object.entries(index.adjacency)) {
    for (const [, target] of edges) predecessors[target]?.push(src)
  }
  const may: Record<string, Set<string>> = {}
  const must: Record<string, Set<string> | null> = {}
  for (const sid of Object.keys(index.kinds)) {
    may[sid] = new Set()
    must[sid] = null
  }
  if (index.firstStep) must[index.firstStep] = new Set()
  const work: string[] = Object.keys(index.kinds).filter(sid => index.reachable.has(sid))
  const queued = new Set(work)
  while (work.length > 0) {
    const sid = work.shift() as string
    queued.delete(sid)
    if (sid === index.firstStep) continue
    const incoming = (predecessors[sid] ?? []).filter(p => index.reachable.has(p))
    if (incoming.length === 0) continue
    const union = new Set<string>()
    let inter: Set<string> | null = null
    for (const p of incoming) {
      for (const key of may[p] ?? []) union.add(key)
      for (const key of index.produced[p] ?? []) union.add(key)
      if (must[p] === null || must[p] === undefined) continue
      const candidate = new Set([...(must[p] ?? []), ...(index.produced[p] ?? [])])
      if (inter === null) {
        inter = candidate
      } else {
        const prior: Set<string> = inter
        inter = new Set([...prior].filter(key => candidate.has(key)))
      }
    }
    let changed = false
    const previousMay = may[sid]
    if (previousMay === undefined || !setsEqual(union, previousMay)) {
      may[sid] = union
      changed = true
    }
    if (inter !== null) {
      const previousMust = must[sid]
      if (previousMust === undefined || previousMust === null || !setsEqual(inter, previousMust)) {
        must[sid] = inter
        changed = true
      }
    }
    if (changed) {
      for (const [, next] of index.adjacency[sid] ?? []) {
        if (!queued.has(next)) {
          work.push(next)
          queued.add(next)
        }
      }
    }
  }
  index.may = may
  index.must = Object.fromEntries(Object.entries(must).map(([key, value]) => [key, value ?? new Set<string>()]))
}

function setsEqual(a: Set<string>, b: Set<string> | null): boolean {
  if (b === null) return false
  if (a.size !== b.size) return false
  for (const key of a) if (!b.has(key)) return false
  return true
}

function computeDistances(index: DocIndex): Record<string, number> {
  const dist: Record<string, number> = {}
  for (const sid of Object.keys(index.kinds)) dist[sid] = INFINITY
  const reversed: Record<string, string[]> = {}
  for (const sid of Object.keys(index.kinds)) reversed[sid] = []
  for (const [src, edges] of Object.entries(index.adjacency)) {
    for (const [, target] of edges) reversed[target]?.push(src)
  }
  const frontier: string[] = []
  for (const [sid, kind] of Object.entries(index.kinds)) {
    if ((index.adjacency[sid] ?? []).length === 0 && (kind === 'screen' || kind === 'redirect')) {
      dist[sid] = kind === 'screen' ? 1 : 0
      frontier.push(sid)
    }
  }
  const done = new Set<string>()
  while (frontier.length > 0) {
    frontier.sort((a, b) => (dist[a] as number) - (dist[b] as number))
    const current = frontier.shift() as string
    if (done.has(current)) continue
    done.add(current)
    for (const prev of reversed[current] ?? []) {
      const cost = index.kinds[prev] === 'screen' ? 1 : 0
      if ((dist[current] as number) + cost < (dist[prev] as number)) {
        dist[prev] = (dist[current] as number) + cost
        frontier.push(prev)
      }
    }
  }
  return dist
}

function hasSelfLoop(index: DocIndex, sid: string): boolean {
  return (index.adjacency[sid] ?? []).some(([, target]) => target === sid)
}

function computeSccs(index: DocIndex): string[][] {
  let counter = 0
  const low: Record<string, number> = {}
  const num: Record<string, number> = {}
  const stack: string[] = []
  const onStack = new Set<string>()
  const out: string[][] = []
  for (const root of Object.keys(index.kinds)) {
    if (root in num) continue
    const work: [string, number][] = [[root, 0]]
    while (work.length > 0) {
      const [node, pos] = work.pop() as [string, number]
      if (pos === 0) {
        num[node] = counter
        low[node] = counter
        counter += 1
        stack.push(node)
        onStack.add(node)
      }
      const edges = index.adjacency[node] ?? []
      let recursed = false
      for (let i = pos; i < edges.length; i++) {
        const target = (edges[i] as [string, string])[1]
        if (!(target in num)) {
          work.push([node, i + 1])
          work.push([target, 0])
          recursed = true
          break
        }
        if (onStack.has(target)) low[node] = Math.min(low[node] as number, num[target] as number)
      }
      if (recursed) continue
      if (low[node] === num[node]) {
        const comp: string[] = []
        for (;;) {
          const member = stack.pop() as string
          onStack.delete(member)
          comp.push(member)
          if (member === node) break
        }
        out.push(comp)
      }
      if (work.length > 0) {
        const parent = (work[work.length - 1] as [string, number])[0]
        low[parent] = Math.min(low[parent] as number, low[node] as number)
      }
    }
  }
  return out
}

function computeOutlineOrder(index: DocIndex): Record<string, number> {
  const order: Record<string, number> = {}
  const stack: string[] = index.firstStep ? [index.firstStep] : []
  while (stack.length > 0) {
    const current = stack.pop() as string
    if (current in order) continue
    order[current] = Object.keys(order).length
    const nextTarget = indexTarget(index, current, 'next') ?? indexTarget(index, current, 'else')
    const branchTargets = (index.adjacency[current] ?? [])
      .filter(
        ([port, target]) =>
          port !== 'next' && port !== 'else' && (target !== nextTarget || index.kinds[current] === 'condition'),
      )
      .map(([, target]) => target)
    if (nextTarget) stack.push(nextTarget)
    stack.push(...[...branchTargets].reverse())
  }
  for (const step of index.doc.steps ?? []) {
    if (!(step.id in order)) order[step.id] = Object.keys(order).length
  }
  return order
}

export function outlineRank(index: DocIndex, target: { screenId?: string | null; id?: string }): number {
  for (const candidate of [target.screenId, target.id]) {
    if (candidate && candidate in index.order) return index.order[candidate] as number
  }
  return INFINITY
}

const indexCache = new WeakMap<JourneyDoc, DocIndex>()

export function buildIndex(doc: JourneyDoc): DocIndex {
  const cached = indexCache.get(doc)
  if (cached) return cached
  const index: DocIndex = {
    doc,
    kinds: {},
    ports: {},
    adjacency: {},
    reachable: new Set(),
    produced: {},
    may: {},
    must: {},
    minToEnd: {},
    sccs: [],
    hasReachableCycle: false,
    firstStep: '',
    order: {},
  }
  for (const step of doc.steps ?? []) index.kinds[step.id] = step.kind
  const start = (doc.steps ?? []).find(step => step.kind === 'start')
  index.firstStep = start ? start.id : ''
  for (const step of doc.steps ?? []) {
    const ports = portsOf(doc, step.id)
    index.ports[step.id] = ports
    const edges: [string, string][] = []
    for (const port of ports) {
      const target = resolveTarget(doc, step.id, port.port)
      if (target && target in index.kinds) edges.push([port.port, target])
    }
    index.adjacency[step.id] = edges
  }
  index.reachable = computeReachable(index)
  for (const step of doc.steps ?? []) {
    const screen = step.kind === 'screen' ? doc.screens?.[step.id] : undefined
    index.produced[step.id] = new Set(screen ? screenOutputs(screen).map(o => o.key) : [])
  }
  computeAvailability(index)
  index.minToEnd = computeDistances(index)
  index.sccs = computeSccs(index)
  index.hasReachableCycle = index.sccs.some(
    comp => (comp.length > 1 || hasSelfLoop(index, comp[0] as string)) && index.reachable.has(comp[0] as string),
  )
  index.order = computeOutlineOrder(index)
  indexCache.set(doc, index)
  return index
}
