import { type DocIndex, indexTarget } from './analysis'
import type { JourneyDoc } from './model/types'

export interface OutlineRow {
  stepId: string
  depth: number
  pathLabel?: string | undefined
  terminal: boolean
  group: 'main' | 'unconnected'
}

export function outline(doc: JourneyDoc, index: DocIndex): OutlineRow[] {
  const rows: OutlineRow[] = []
  const seen = new Set<string>()
  const visit = (stepId: string, depth: number, pathLabel?: string): void => {
    if (seen.has(stepId)) return
    seen.add(stepId)
    rows.push({
      stepId,
      depth,
      pathLabel,
      terminal: (index.ports[stepId] ?? []).length === 0,
      group: 'main',
    })
    const nextTarget = indexTarget(index, stepId, 'next') ?? indexTarget(index, stepId, 'else')
    for (const port of index.ports[stepId] ?? []) {
      if (port.port === 'next' || port.port === 'else') continue
      const target = indexTarget(index, stepId, port.port)
      if (target && (target !== nextTarget || index.kinds[stepId] === 'condition')) visit(target, depth + 1, port.label)
    }
    if (nextTarget) visit(nextTarget, depth)
  }
  if (index.firstStep) visit(index.firstStep, 0)
  for (const step of doc.steps ?? []) {
    if (!seen.has(step.id) && step.kind !== 'start')
      rows.push({
        stepId: step.id,
        depth: 0,
        terminal: (index.ports[step.id] ?? []).length === 0,
        group: 'unconnected',
      })
  }
  return rows
}

export function outlineOrder(doc: JourneyDoc, index: DocIndex): string[] {
  return outline(doc, index).map(row => row.stepId)
}
