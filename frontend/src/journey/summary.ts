import { isConditionStep, isRedirectStep, isStartStep } from './model/guards'
import type { Element, JourneyDoc, Screen } from './model/types'

const MARKS = /[*_`#>[\]()]|\{\{[^}]*\}\}/g

export function plain(text: string, limit = 60): string {
  const cleaned = (text || '').replace(MARKS, '').split(/\s+/).join(' ').trim()
  if (cleaned.length <= limit) return cleaned
  return `${cleaned.slice(0, limit - 1).trimEnd()}…`
}

export function screenName(screen: Screen): string {
  for (const el of screen.elements ?? []) {
    if (el.type === 'heading' && (el.props.text || '').trim()) return plain(el.props.text)
    if ((el.type === 'choice' || el.type === 'rating') && (el.props.question || '').trim())
      return plain(el.props.question)
  }
  return screen.name || 'Untitled screen'
}

export function stepName(doc: JourneyDoc, stepId: string): string {
  const screen = doc.screens?.[stepId]
  if (screen) return screenName(screen)
  for (const step of doc.steps ?? []) {
    if (step.id === stepId) {
      if (isConditionStep(step)) return step.label || 'Condition'
      if (isRedirectStep(step)) return 'Redirect'
      if (isStartStep(step)) return 'Start'
    }
  }
  return 'Unknown step'
}

export function elementLabel(el: Element): string {
  switch (el.type) {
    case 'heading':
      return `Heading ‘${plain(el.props.text, 40)}’`
    case 'text':
      return `Text ‘${plain(el.props.text, 40)}’`
    case 'buttons':
      return `Buttons ${(el.props.items ?? [])
        .slice(0, 2)
        .map(i => `‘${plain(i.label, 24)}’`)
        .join(', ')}`
    case 'choice':
      return `Question ‘${plain(el.props.question, 40)}’`
    case 'rating':
      return `Rating ‘${plain(el.props.question, 40)}’`
    case 'form':
      return 'Form'
    case 'cards':
      return 'Cards'
    case 'image':
      return 'Image'
    case 'video':
      return 'Video'
    case 'countdown':
      return 'Countdown'
    case 'spacer':
      return 'Spacer'
  }
}

export function docSummary(doc: JourneyDoc): string {
  const names = Object.values(doc.screens ?? {}).map(screenName)
  return `${names.length} screens: ${names.slice(0, 10).join(', ')}`
}
