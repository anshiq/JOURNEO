import type { JourneyDoc } from '../model/types'
import { screenOutputs } from '../ports'
import type { EngineEvent, Vars } from './state'

function outcomeTallies(vars: Vars): Record<string, number> {
  const outcomes = vars.outcomes
  if (typeof outcomes === 'object' && outcomes !== null && !Array.isArray(outcomes))
    return { ...(outcomes as Record<string, number>) }
  return {}
}

export function applyAnswers(doc: JourneyDoc, stepId: string, vars: Vars, answers: Vars): Vars {
  const screen = doc.screens?.[stepId]
  if (!screen) return vars
  let next: Vars = { ...vars }
  let score = typeof next.score === 'number' ? next.score : 0
  let scoreChanged = typeof next.score === 'number'
  let outcomes = outcomeTallies(next)
  let outcomesChanged = false
  for (const output of screenOutputs(screen)) {
    if (!Object.hasOwn(answers, output.key)) continue
    const value = answers[output.key]
    next = { ...next, [output.key]: value }
    if (output.type === 'choice' || output.type === 'choices') {
      const element = (screen.elements ?? []).find(el => el.id === output.elementId)
      if (element?.type !== 'choice') continue
      const selected = output.type === 'choice' ? [value] : Array.isArray(value) ? value : []
      for (const optionId of selected) {
        const option = (element.props.options ?? []).find(opt => opt.id === optionId)
        if (typeof option?.points === 'number') {
          score += option.points
          scoreChanged = true
        }
        if (typeof option?.outcome === 'string' && option.outcome) {
          outcomes = { ...outcomes, [option.outcome]: (outcomes[option.outcome] ?? 0) + 1 }
          outcomesChanged = true
        }
      }
    }
  }
  if (scoreChanged) next = { ...next, score }
  if (outcomesChanged) next = { ...next, outcomes }
  return next
}

export function answerEvents(doc: JourneyDoc, stepId: string, answers: Vars): EngineEvent[] {
  const screen = doc.screens?.[stepId]
  if (!screen) return []
  const events: EngineEvent[] = []
  for (const output of screenOutputs(screen)) {
    if (Object.hasOwn(answers, output.key)) events.push({ type: 'answer', key: output.key, value: answers[output.key] })
  }
  return events
}
