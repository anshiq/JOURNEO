import { buildIndex, type DocIndex, INFINITY } from '../analysis'
import type { JourneyDoc } from '../model/types'
import type { EngineState } from './state'

export function progressFor(
  _doc: JourneyDoc,
  index: DocIndex,
  state: EngineState,
  previous: number | null,
): number | null {
  if (index.hasReachableCycle) return null
  if (state.status !== 'running') return 1
  const top = state.stack[state.stack.length - 1]
  if (!top) return 0
  const remaining = Math.max(0, (index.minToEnd[top.stepId] ?? INFINITY) - 1)
  if (remaining >= INFINITY) return previous ?? 0
  const visited = state.stack.length
  const current = visited / (visited + remaining)
  return Math.max(previous ?? 0, Math.min(1, current))
}

export function progressLabel(doc: JourneyDoc, state: EngineState): string | null {
  const index = buildIndex(doc)
  if (index.hasReachableCycle) return null
  const top = state.stack[state.stack.length - 1]
  if (!top) return null
  const remaining = Math.max(0, (index.minToEnd[top.stepId] ?? INFINITY) - 1)
  if (remaining >= INFINITY) return null
  const visited = state.stack.length
  return `Step ${visited} of ${visited + remaining}`
}
