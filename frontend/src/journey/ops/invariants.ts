import type { JourneyDoc } from '../model/types'

export function invariantProblems(doc: JourneyDoc): string[] {
  const problems: string[] = []
  const seen = new Set<string>()
  const claim = (id: string) => {
    if (seen.has(id)) problems.push(`duplicate id ${id}`)
    seen.add(id)
  }
  const steps = doc.steps ?? []
  if (steps.filter(s => s.kind === 'start').length !== 1) problems.push('exactly one start step required')
  const kinds = new Map(steps.map(s => [s.id, s.kind]))
  for (const step of steps) {
    claim(step.id)
    if (step.kind === 'condition') for (const rule of step.rules ?? []) claim(rule.id)
    if (step.kind === 'screen' && !doc.screens?.[step.id]) problems.push(`screen step ${step.id} has no screen`)
  }
  for (const [key, screen] of Object.entries(doc.screens ?? {})) {
    if (key !== screen.id) problems.push(`screen key ${key} mismatch`)
    if (kinds.get(key) !== 'screen') problems.push(`screen ${key} has no step`)
    for (const el of screen.elements ?? []) {
      claim(el.id)
      const props = el.props as Record<string, unknown>
      for (const attr of ['items', 'options', 'fields', 'bands']) {
        for (const item of (props[attr] as { id: string }[] | undefined) ?? []) claim(item.id)
      }
    }
  }
  for (const [from, ports] of Object.entries(doc.links ?? {})) {
    if (!kinds.has(from)) problems.push(`link from unknown ${from}`)
    for (const to of Object.values(ports)) {
      if (!kinds.has(to)) problems.push(`link to unknown ${to}`)
      else if (kinds.get(to) === 'start') problems.push('link to start')
    }
  }
  return problems
}

export function assertDoc(doc: JourneyDoc): void {
  const problems = invariantProblems(doc)
  if (problems.length) throw new Error(`Invalid journey: ${problems.join('; ')}`)
}
