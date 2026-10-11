import '@xyflow/react/dist/style.css'
import { ExperienceRoot, ScreenView } from '@experience/index'
import { buildIndex } from '@journey/analysis'
import type { JourneyDoc, Screen } from '@journey/model/types'
import { insertConditionOnLink, insertRedirectOnLink, insertScreenOnLink } from '@journey/ops/index'
import { stepName } from '@journey/summary'
import { cn } from '@shared/ui/cn'
import {
  Background,
  BaseEdge,
  Controls,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  getSmoothStepPath,
  Handle,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'
import { ExternalLink, GitBranch, Plus } from 'lucide-react'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useRecipes } from '../queries/library'
import { useEditor } from '../store'
import { act } from '../store/commands'
import { Popover, PopoverClose } from '../ui/Popover'
import { layout } from './layout'

const SIZE: Record<string, { width: number; height: number }> = {
  start: { width: 90, height: 40 },
  screen: { width: 200, height: 196 },
  condition: { width: 200, height: 96 },
  redirect: { width: 180, height: 64 },
}

type StepData = {
  stepId: string
  kind: string
  label: string
  order: number | null
  total: number
  errors: number
  terminal: boolean
}
type LinkData = { source: string; port: string; label: string; visited: boolean }

const noop = () => undefined
const EMPTY = {}

const Thumbnail = memo(function Thumbnail({
  theme,
  settings,
  screen,
}: {
  theme: JourneyDoc['theme']
  settings: JourneyDoc['settings']
  screen: Screen
}) {
  const lite = useMemo<JourneyDoc>(
    () => ({
      schemaVersion: 4,
      ...(theme ? { theme } : {}),
      ...(settings ? { settings } : {}),
      screens: { [screen.id]: screen },
      steps: [{ id: screen.id, kind: 'screen' }],
    }),
    [theme, settings, screen],
  )
  return (
    <div
      className="pointer-events-none h-[120px] w-full overflow-hidden rounded-md border border-slate-200 bg-white"
      style={{ contain: 'strict' }}
    >
      <div style={{ width: 390, transform: 'scale(0.46)', transformOrigin: 'top left' }}>
        <ExperienceRoot theme={lite.theme} breakpoint="mobile">
          {bp => (
            <ScreenView
              doc={lite}
              screenId={screen.id}
              vars={EMPTY}
              breakpoint={bp}
              mode="thumbnail"
              isFirst
              onExit={noop}
            />
          )}
        </ExperienceRoot>
      </div>
    </div>
  )
})

function StepNode({ data, selected }: NodeProps<Node<StepData>>) {
  const doc = useEditor(state => state.doc)
  const visited = useEditor(state => state.visited.includes(data.stepId))
  const screen = doc?.screens?.[data.stepId]
  const base = 'rounded-lg border bg-white text-left shadow-sm transition'
  const ring = selected
    ? 'border-indigo-500 ring-2 ring-indigo-200'
    : visited
      ? 'border-emerald-500 ring-2 ring-emerald-200'
      : 'border-slate-300'
  return (
    <div
      className={cn(
        base,
        ring,
        data.kind === 'start' ? 'flex h-10 items-center justify-center rounded-full px-4 text-xs font-semibold' : 'p-2',
      )}
      style={SIZE[data.kind]}
    >
      {data.kind !== 'start' ? (
        <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-slate-400" />
      ) : null}
      {data.kind === 'start' ? 'Start' : null}
      {data.kind === 'screen' && screen && doc ? (
        <>
          <div className="flex items-center justify-between gap-1 pb-1">
            <span className="truncate text-xs font-medium">{data.label}</span>
            {data.errors ? (
              <span className="rounded-full bg-rose-100 px-1.5 text-[10px] text-rose-700">{data.errors}</span>
            ) : null}
          </div>
          <Thumbnail theme={doc.theme} settings={doc.settings} screen={screen} />
          <p className="pt-1 text-[10px] text-slate-500">
            {data.order !== null ? `Screen ${data.order} of ${data.total}` : 'Not connected'}
            {data.terminal ? ' · Ends here' : ''}
          </p>
        </>
      ) : null}
      {data.kind === 'condition' ? (
        <>
          <p className="flex items-center gap-1 text-xs font-medium">
            <GitBranch size={12} /> {data.label}
          </p>
          <ul className="mt-1 space-y-0.5 text-[10px] text-slate-600">
            {(doc?.steps ?? [])
              .flatMap(step => (step.id === data.stepId && step.kind === 'condition' ? (step.rules ?? []) : []))
              .slice(0, 4)
              .map(rule => (
                <li key={rule.id} className="truncate">
                  {rule.label}
                </li>
              ))}
            <li className="text-slate-400">Otherwise</li>
          </ul>
        </>
      ) : null}
      {data.kind === 'redirect' ? (
        <p className="flex items-center gap-1 text-xs font-medium">
          <ExternalLink size={12} /> Redirect
        </p>
      ) : null}
      {data.kind !== 'redirect' && !data.terminal ? (
        <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-slate-400" />
      ) : null}
    </div>
  )
}

function LinkEdge(props: EdgeProps<Edge<LinkData>>) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd } = props
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  })
  const recipes = useRecipes()
  if (!data) return null
  return (
    <>
      <BaseEdge
        path={path}
        {...(markerEnd ? { markerEnd } : {})}
        style={{ stroke: data.visited ? '#10b981' : '#94a3b8', strokeWidth: data.visited ? 2.5 : 1.5 }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto absolute flex items-center gap-1"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {data.label ? (
            <span className="max-w-28 truncate rounded bg-white px-1 text-[10px] text-slate-600 shadow-sm">
              {data.label}
            </span>
          ) : null}
          <Popover
            className="w-64"
            trigger={
              <button
                type="button"
                aria-label="Insert a step here"
                className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm hover:border-indigo-400 hover:text-indigo-700"
              >
                <Plus size={12} />
              </button>
            }
          >
            <p className="px-1 pb-1 text-xs font-medium text-slate-500">Insert here</p>
            <PopoverClose asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100"
                onClick={() => act('Add condition', insertConditionOnLink(data.source, data.port))}
              >
                <GitBranch size={13} /> Condition
              </button>
            </PopoverClose>
            <PopoverClose asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100"
                onClick={() => act('Add redirect', insertRedirectOnLink(data.source, data.port))}
              >
                <ExternalLink size={13} /> Redirect
              </button>
            </PopoverClose>
            <p className="px-1 pt-2 pb-1 text-xs font-medium text-slate-500">Screen</p>
            {(recipes.data ?? []).map(recipe => (
              <PopoverClose asChild key={recipe.id}>
                <button
                  type="button"
                  className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-100"
                  onClick={() =>
                    act(
                      'Add screen',
                      insertScreenOnLink(data.source, data.port, recipe as never, { name: recipe.name }),
                    )
                  }
                >
                  {recipe.name}
                </button>
              </PopoverClose>
            ))}
          </Popover>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

const nodeTypes = { step: StepNode }
const edgeTypes = { link: LinkEdge }

function structure(doc: JourneyDoc): string {
  return JSON.stringify([(doc.steps ?? []).map(step => step.id), doc.links ?? {}])
}

function Flow() {
  const doc = useEditor(state => state.doc)
  const selection = useEditor(state => state.selection)
  const issues = useEditor(state => state.issues)
  const visited = useEditor(state => state.visited)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const { fitView } = useReactFlow()
  const fitted = useRef(false)
  useEffect(() => {
    if (fitted.current || Object.keys(positions).length === 0) return
    fitted.current = true
    const frame = window.requestAnimationFrame(() => void fitView({ padding: 0.15, maxZoom: 1 }))
    return () => window.cancelAnimationFrame(frame)
  }, [positions, fitView])
  const index = useMemo(() => (doc ? buildIndex(doc) : null), [doc])
  const key = doc ? structure(doc) : ''
  const docRef = useRef(doc)
  docRef.current = doc
  const graph = useMemo(() => {
    if (!doc || !index) return { nodes: [] as Node<StepData>[], edges: [] as Edge<LinkData>[] }
    const screens = Object.keys(doc.screens ?? {})
    const ordered = screens
      .filter(id => index.reachable.has(id))
      .sort((a, b) => (index.order[a] ?? 0) - (index.order[b] ?? 0))
    const selectedId =
      selection.kind === 'screen' || selection.kind === 'element' || selection.kind === 'item'
        ? selection.screenId
        : selection.kind === 'step'
          ? selection.stepId
          : null
    const nodes: Node<StepData>[] = (doc.steps ?? []).map(step => {
      const kind = step.kind
      const position = ordered.indexOf(step.id)
      return {
        id: step.id,
        type: 'step',
        position: positions[step.id] ?? { x: 0, y: 0 },
        selected: selectedId === step.id,
        data: {
          stepId: step.id,
          kind,
          label: stepName(doc, step.id),
          order: position >= 0 ? position + 1 : null,
          total: ordered.length,
          errors: issues.filter(
            issue => issue.severity === 'error' && (issue.target.screenId ?? issue.target.id) === step.id,
          ).length,
          terminal: kind === 'screen' && (index.ports[step.id] ?? []).length === 0,
        },
      }
    })
    const edges: Edge<LinkData>[] = []
    for (const [source, ports] of Object.entries(doc.links ?? {})) {
      for (const [port, target] of Object.entries(ports)) {
        const label =
          port === 'next'
            ? ''
            : port === 'else'
              ? 'Otherwise'
              : ((index.ports[source] ?? []).find(p => p.port === port)?.label ?? '')
        const at = visited.indexOf(source)
        edges.push({
          id: `${source}:${port}`,
          source,
          target,
          type: 'link',
          data: { source, port, label, visited: at >= 0 && visited[at + 1] === target },
        })
      }
    }
    return { nodes, edges }
  }, [doc, index, positions, selection, issues, visited])
  useEffect(() => {
    const doc = docRef.current
    if (!doc || !key) return
    let cancelled = false
    const run = async () => {
      const result = await layout({
        nodes: (doc.steps ?? []).map(step => ({ id: step.id, ...(SIZE[step.kind] ?? { width: 200, height: 100 }) })),
        edges: Object.entries(doc.links ?? {}).flatMap(([source, ports]) =>
          Object.entries(ports).map(([port, target]) => ({ id: `${source}:${port}`, source, target })),
        ),
      })
      if (!cancelled) setPositions(result)
    }
    void run().catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [key])
  if (!doc) return null
  return (
    <ReactFlow
      nodes={graph.nodes}
      edges={graph.edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      fitView
      minZoom={0.2}
      maxZoom={1.5}
      proOptions={{ hideAttribution: true }}
      onNodeClick={(_event, node) => {
        const stepId = node.id
        const state = useEditor.getState()
        if (state.doc?.screens?.[stepId]) state.select({ kind: 'screen', screenId: stepId })
        else state.select({ kind: 'step', stepId })
      }}
      onNodeDoubleClick={(_event, node) => {
        if (useEditor.getState().doc?.screens?.[node.id]) useEditor.getState().setCanvas('screen')
      }}
    >
      <Background gap={20} color="#e2e8f0" />
      <Controls showInteractive={false} />
    </ReactFlow>
  )
}

export function FlowCanvas() {
  return (
    <div className="h-full w-full" data-testid="flow">
      <ReactFlowProvider>
        <Flow />
      </ReactFlowProvider>
    </div>
  )
}
