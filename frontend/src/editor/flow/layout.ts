import type { ElkNode } from 'elkjs/lib/elk-api'
import ELK from 'elkjs/lib/elk-api'

let instance: InstanceType<typeof ELK> | null = null

function elk(): InstanceType<typeof ELK> {
  instance ??= new ELK({
    workerFactory: () => new Worker(new URL('elkjs/lib/elk-worker.min.js', import.meta.url), { type: 'module' }),
  })
  return instance
}

export interface LayoutInput {
  nodes: { id: string; width: number; height: number }[]
  edges: { id: string; source: string; target: string }[]
}

export async function layout(input: LayoutInput): Promise<Record<string, { x: number; y: number }>> {
  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.layered.spacing.nodeNodeBetweenLayers': '90',
      'elk.spacing.nodeNode': '40',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',
    },
    children: input.nodes.map(node => ({ id: node.id, width: node.width, height: node.height })),
    edges: input.edges.map(edge => ({ id: edge.id, sources: [edge.source], targets: [edge.target] })),
  }
  const result = await elk().layout(graph)
  const out: Record<string, { x: number; y: number }> = {}
  for (const child of result.children ?? []) out[child.id] = { x: child.x ?? 0, y: child.y ?? 0 }
  return out
}
