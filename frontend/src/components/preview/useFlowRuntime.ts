import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { bus } from '../../lib/eventBus'
import type { ViewportId } from '../../lib/viewports'
import { STEP_COLORS, STUDIO_ONLY_NODE_TYPES, type ExecutionSnapshot, type FlowEdge, type FlowNode, type NodeExecutionState } from './types'

const WAITING_STATE = (id: string): NodeExecutionState => ({ id, stepIndex: -1, stepColor: 'bg-slate-300', highlightColor: '#cbd5e1', isActive: false, isPending: true, isDisabled: true, status: 'waiting', label: 'Waiting to appear', nodesInStep: [] })

function actionLabelFor(nodeType: string, handle?: string): string {
  switch (nodeType) {
    case 'trigger': return 'Journey triggered'
    case 'image': return 'Viewed image'
    case 'video': return handle === 'skipped' ? 'Skipped video' : 'Watched video'
    case 'text': return 'Read text'
    case 'condition': return handle ? `Condition: ${handle}` : 'Branch taken'
    case 'quiz': return handle === 'skipped' ? 'Skipped quiz' : 'Answered quiz'
    case 'form': return 'Submitted form'
    case 'countdown': return 'Viewed countdown'
    case 'end': return 'Journey completed'
    default: return `Interacted with ${nodeType}`
  }
}

export interface FlowRuntime {
  nodes: FlowNode[]
  edges: FlowEdge[]
  node?: FlowNode
  nodeState?: NodeExecutionState
  finished: boolean
  selectedId: string | null
  flashingId: string | null
  advance: (handle?: string) => void
  restart: () => void
  selectNode: (nodeId: string) => void
}

export function useFlowRuntime({ nodes: rawNodes, edges: rawEdges, viewportId, studio, startNodeId }: { nodes: FlowNode[]; edges: FlowEdge[]; viewportId: ViewportId; studio: boolean; startNodeId?: string }): FlowRuntime {
  const nodes = useMemo(() => rawNodes.filter(n => !STUDIO_ONLY_NODE_TYPES.includes(n.type)), [rawNodes])
  const edges = useMemo(() => {
    const ids = new Set(nodes.map(n => n.id))
    return rawEdges.filter(e => ids.has(e.source) && ids.has(e.target))
  }, [nodes, rawEdges])
  const nodeById = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])
  const entryId = useMemo(() => nodes[0]?.id, [nodes])
  const [history, setHistory] = useState<ExecutionSnapshot[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [currentId, setCurrentId] = useState<string | undefined>(entryId)
  const [finished, setFinished] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [flashingId, setFlashingId] = useState<string | null>(null)
  const viewportRef = useRef(viewportId)
  useEffect(() => { viewportRef.current = viewportId }, [viewportId])

  const stepColor = (stepIndex: number) => STEP_COLORS[stepIndex % STEP_COLORS.length]
  const snapshot = historyIndex >= 0 && historyIndex < history.length ? history[historyIndex] : null

  const reachableFrom = useCallback((startId: string) => {
    const reached = new Set<string>()
    const queue = [startId]
    while (queue.length) {
      const id = queue.shift()!
      if (reached.has(id)) continue
      reached.add(id)
      edges.filter(e => e.source === id).forEach(e => queue.push(e.target))
    }
    return reached
  }, [edges])

  const collectReachable = useCallback((startId: string, result: Set<string>, protectedPath: Set<string>) => {
    const queue = [startId]
    while (queue.length) {
      const id = queue.shift()!
      if (result.has(id) || protectedPath.has(id)) continue
      result.add(id)
      edges.filter(e => e.source === id).forEach(e => queue.push(e.target))
    }
  }, [edges])

  const findPath = useCallback((from: string, to: string): string[] | null => {
    const queue: string[][] = [[from]]
    const visited = new Set<string>([from])
    while (queue.length) {
      const path = queue.shift()!
      const last = path[path.length - 1]
      if (last === to) return path
      for (const e of edges.filter(ed => ed.source === last)) {
        if (!visited.has(e.target)) {
          visited.add(e.target)
          queue.push([...path, e.target])
        }
      }
    }
    return null
  }, [edges])

  const initialize = useCallback(() => {
    if (!entryId) {
      setHistory([])
      setHistoryIndex(-1)
      setCurrentId(undefined)
      setFinished(false)
      return
    }
    const nodeStates = new Map<string, NodeExecutionState>(nodes.map(n => [n.id, n.id === entryId
      ? { id: n.id, stepIndex: 0, stepColor: STEP_COLORS[0].bg, highlightColor: STEP_COLORS[0].hex, isActive: true, isPending: false, isDisabled: false, status: 'active' as const, label: STEP_COLORS[0].label, nodesInStep: [entryId] }
      : WAITING_STATE(n.id)]))
    const initial: ExecutionSnapshot = {
      currentNodeId: entryId,
      visibleNodeIds: new Set([entryId]),
      visitedNodeIds: new Set(),
      pendingNodeIds: new Set(nodes.filter(n => n.id !== entryId).map(n => n.id)),
      nodeStates,
      stepIndex: 0,
      actionLabel: 'Journey started',
    }
    setHistory([initial])
    setHistoryIndex(0)
    setCurrentId(entryId)
    setFinished(false)
  }, [entryId, nodes])

  const jumpToNode = useCallback((targetId: string, from?: string) => {
    const start = from || currentId || entryId
    if (!start) return
    const path = findPath(start, targetId) || findPath(entryId!, targetId)
    if (!path) return
    const built: ExecutionSnapshot[] = []
    const visited = new Set<string>()
    const nodeStates = new Map<string, NodeExecutionState>(nodes.map(n => [n.id, WAITING_STATE(n.id)]))
    path.forEach((nodeId, idx) => {
      const color = stepColor(idx)
      const isTarget = nodeId === targetId
      visited.add(nodeId)
      nodeStates.set(nodeId, { id: nodeId, stepIndex: idx, stepColor: color.bg, highlightColor: color.hex, isActive: isTarget, isPending: false, isDisabled: false, status: isTarget ? 'active' : 'completed', label: color.label, nodesInStep: [nodeId] })
      built.push({
        currentNodeId: nodeId,
        visibleNodeIds: new Set([nodeId]),
        visitedNodeIds: new Set(Array.from(visited).slice(0, -1)),
        pendingNodeIds: new Set(nodes.filter(n => !visited.has(n.id)).map(n => n.id)),
        nodeStates: new Map(nodeStates),
        stepIndex: idx,
        actionLabel: idx === 0 ? 'Journey started' : `Step ${idx}`,
      })
    })
    setHistory(built)
    setHistoryIndex(built.length - 1)
    setCurrentId(targetId)
    setFinished(false)
  }, [currentId, entryId, findPath, nodes])

  const graphSignature = useMemo(() => `${nodes.map(n => n.id).join(',')}|${edges.map(e => `${e.source}-${e.target}-${e.sourceHandle || ''}`).join(',')}`, [nodes, edges])
  useEffect(() => {
    initialize()
    if (startNodeId && startNodeId !== entryId && nodeById.has(startNodeId)) jumpToNode(startNodeId, entryId)
  }, [graphSignature, startNodeId])

  useEffect(() => {
    if (!studio) return
    const handler = (p: any) => {
      if (p.nodeId) {
        setSelectedId(p.nodeId)
        setFlashingId(p.nodeId)
        window.setTimeout(() => setFlashingId(null), 500)
      } else setSelectedId(null)
    }
    bus.on('node:select', handler as any)
    return () => { bus.off('node:select', handler as any) }
  }, [studio])

  const prevSelectedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!studio) return
    if (selectedId && selectedId !== prevSelectedRef.current && nodeById.has(selectedId)) {
      prevSelectedRef.current = selectedId
      if (selectedId !== currentId) jumpToNode(selectedId)
    } else if (!selectedId) prevSelectedRef.current = null
  }, [selectedId, studio])

  useEffect(() => {
    if (!studio || !snapshot) return
    const activeStepNodes = Array.from(snapshot.nodeStates.values()).filter(s => s.stepIndex === snapshot.stepIndex).flatMap(s => s.nodesInStep || [])
    bus.emit('execution:change', { currentNodeId: snapshot.currentNodeId, actionLabel: snapshot.actionLabel, stepIndex: snapshot.stepIndex, historyIndex, historyLength: history.length, states: Array.from(snapshot.nodeStates.values()), activeStepNodes, viewportId: viewportRef.current })
  }, [snapshot, historyIndex, history.length, studio])

  const advance = useCallback((handle?: string) => {
    if (!currentId || !snapshot) return
    const out = edges.filter(e => e.source === currentId)
    const edge = handle ? (out.find(e => e.sourceHandle === handle) || out[0]) : out[0]
    if (!edge) { setFinished(true); return }
    const nextNodeId = edge.target
    const nextNode = nodeById.get(nextNodeId)
    if (!nextNode) return
    const nextStepIndex = snapshot.stepIndex + 1
    const color = stepColor(nextStepIndex)
    const newVisited = new Set(snapshot.visitedNodeIds)
    newVisited.add(currentId)
    const newNodeStates = new Map(snapshot.nodeStates)
    const currentState = newNodeStates.get(currentId)
    newNodeStates.set(currentId, { ...(currentState || WAITING_STATE(currentId)), isActive: false, isPending: false, isDisabled: false, status: 'completed', nodesInStep: currentState?.nodesInStep || [currentId] })
    newNodeStates.set(nextNodeId, { id: nextNodeId, stepIndex: nextStepIndex, stepColor: color.bg, highlightColor: color.hex, isActive: true, isPending: false, isDisabled: false, status: 'active', label: color.label, nodesInStep: [nextNodeId] })
    const alternativeTargets = out.filter(candidate => candidate !== edge).map(candidate => candidate.target)
    const selectedPath = reachableFrom(nextNodeId)
    const removedByAction = new Set<string>()
    alternativeTargets.forEach(target => collectReachable(target, removedByAction, selectedPath))
    const allVisitedIds = new Set([...newVisited, nextNodeId])
    const remainingPending = nodes.filter(n => !allVisitedIds.has(n.id) && !removedByAction.has(n.id)).map(n => n.id)
    nodes.forEach(pendingNode => {
      if (pendingNode.id === nextNodeId || allVisitedIds.has(pendingNode.id)) return
      const removed = removedByAction.has(pendingNode.id)
      newNodeStates.set(pendingNode.id, { id: pendingNode.id, stepIndex: -1, stepColor: 'bg-slate-300', highlightColor: '#cbd5e1', isActive: false, isPending: true, isDisabled: true, status: removed ? 'disabled' : 'waiting', label: removed ? 'Removed by this action' : 'Waiting to appear', nodesInStep: [] })
    })
    const next: ExecutionSnapshot = {
      currentNodeId: nextNodeId,
      visibleNodeIds: new Set([nextNodeId]),
      visitedNodeIds: newVisited,
      pendingNodeIds: new Set(remainingPending),
      nodeStates: newNodeStates,
      stepIndex: nextStepIndex,
      actionLabel: actionLabelFor(nextNode.type, handle),
    }
    const nextHistory = history.slice(0, historyIndex + 1)
    nextHistory.push(next)
    setHistory(nextHistory)
    setHistoryIndex(nextHistory.length - 1)
    setCurrentId(nextNodeId)
    setFinished(false)
    if (studio) {
      bus.emit('node:select', { nodeId: nextNodeId, source: 'device' })
      bus.emit('execution:advance', { from: currentId, to: nextNodeId, handle })
    }
    bus.emit('node:track', { nodeId: nextNodeId, type: nextNode.type, handle, viewportId: viewportRef.current })
  }, [currentId, snapshot, edges, nodeById, nodes, history, historyIndex, reachableFrom, collectReachable, studio])

  const selectNode = useCallback((nodeId: string) => {
    if (!studio) return
    bus.emit('node:select', { nodeId: selectedId === nodeId ? null : nodeId, source: 'device' })
  }, [selectedId, studio])

  const node = currentId ? nodeById.get(currentId) : undefined
  return {
    nodes,
    edges,
    node,
    nodeState: snapshot?.nodeStates.get(currentId || ''),
    finished,
    selectedId,
    flashingId,
    advance,
    restart: initialize,
    selectNode,
  }
}
