import type { Element, JourneyDoc, Screen } from './model/types'

export interface Port {
  port: string
  label: string
  elementId?: string
  itemId?: string
  validates: boolean
  fallback: 'next' | null
}

export interface AnswerOption {
  id: string
  label: string
}

export interface Output {
  key: string
  type: 'text' | 'email' | 'phone' | 'number' | 'date' | 'choice' | 'choices' | 'rating' | 'boolean'
  label: string
  elementId: string
  options?: AnswerOption[]
}

const FIELD_OUTPUT: Record<string, Output['type']> = {
  name: 'text',
  email: 'email',
  phone: 'phone',
  company: 'text',
  text: 'text',
  longtext: 'text',
  number: 'number',
  date: 'date',
  dropdown: 'text',
  consent: 'boolean',
}

export function fieldOutputType(kind: string): Output['type'] {
  return FIELD_OUTPUT[kind] ?? 'text'
}

function nextProducers(screen: Screen): { elementId: string; itemId: string | null; label: string }[] {
  const found: { elementId: string; itemId: string | null; label: string }[] = []
  for (const el of screen.elements ?? []) {
    if (el.type === 'buttons') {
      for (const item of el.props.items ?? []) {
        if (item.action.kind === 'next') found.push({ elementId: el.id, itemId: item.id, label: item.label })
      }
    } else if (el.type === 'cards') {
      for (const item of el.props.items ?? []) {
        if (item.button?.action.kind === 'next')
          found.push({ elementId: el.id, itemId: item.id, label: item.button.label })
      }
    } else if (el.type === 'choice' && (el.props.autoAdvance ?? false) && !(el.props.multiple ?? false)) {
      found.push({ elementId: el.id, itemId: null, label: el.props.question || 'Answer' })
    } else if (el.type === 'form') {
      found.push({ elementId: el.id, itemId: null, label: el.props.submitLabel ?? 'Submit' })
    }
  }
  return found
}

const screenPortsCache = new WeakMap<Screen, Port[]>()

export function screenPorts(screen: Screen): Port[] {
  const cached = screenPortsCache.get(screen)
  if (cached) return cached
  const ports: Port[] = []
  for (const el of screen.elements ?? []) {
    if (el.type === 'buttons') {
      for (const item of el.props.items ?? []) {
        if (item.action.kind === 'goto')
          ports.push({
            port: `${el.id}:${item.id}`,
            label: item.label,
            elementId: el.id,
            itemId: item.id,
            validates: !(item.action.skipValidation ?? false),
            fallback: 'next',
          })
      }
    } else if (el.type === 'cards') {
      for (const item of el.props.items ?? []) {
        if (item.button?.action.kind === 'goto')
          ports.push({
            port: `${el.id}:${item.id}`,
            label: item.button.label,
            elementId: el.id,
            itemId: item.id,
            validates: !(item.button.action.skipValidation ?? false),
            fallback: 'next',
          })
      }
    } else if (el.type === 'choice' && (el.props.branchByAnswer ?? false) && !(el.props.multiple ?? false)) {
      for (const opt of el.props.options ?? []) {
        ports.push({
          port: `${el.id}:opt:${opt.id}`,
          label: opt.label,
          elementId: el.id,
          itemId: opt.id,
          validates: true,
          fallback: 'next',
        })
      }
      if (el.props.other ?? false)
        ports.push({ port: `${el.id}:opt:other`, label: 'Other', elementId: el.id, validates: true, fallback: 'next' })
    } else if (el.type === 'rating' && (el.props.branchByScore ?? false)) {
      for (const band of el.props.bands ?? []) {
        ports.push({
          port: `${el.id}:band:${band.id}`,
          label: band.label,
          elementId: el.id,
          itemId: band.id,
          validates: true,
          fallback: 'next',
        })
      }
    }
  }
  const result: Port[] =
    nextProducers(screen).length > 0 || ports.length > 0
      ? [{ port: 'next', label: 'Next', validates: true, fallback: null }, ...ports]
      : []
  screenPortsCache.set(screen, result)
  return result
}

export function stepById(doc: JourneyDoc, stepId: string) {
  return (doc.steps ?? []).find(step => step.id === stepId)
}

const portsOfCache = new WeakMap<JourneyDoc, Map<string, Port[]>>()

export function portsOf(doc: JourneyDoc, stepId: string): Port[] {
  let perDoc = portsOfCache.get(doc)
  if (!perDoc) {
    perDoc = new Map()
    portsOfCache.set(doc, perDoc)
  }
  const cached = perDoc.get(stepId)
  if (cached) return cached
  const step = stepById(doc, stepId)
  let result: Port[] = []
  if (step) {
    if (step.kind === 'start') {
      result = [{ port: 'next', label: 'Start', validates: false, fallback: null }]
    } else if (step.kind === 'screen') {
      const screen = doc.screens?.[stepId]
      result = screen ? screenPorts(screen) : []
    } else if (step.kind === 'condition') {
      result = [
        ...(step.rules ?? []).map(rule => ({
          port: `rule:${rule.id}`,
          label: rule.label,
          validates: false,
          fallback: null as null,
        })),
        { port: 'else', label: 'Otherwise', validates: false, fallback: null as null },
      ]
    }
  }
  perDoc.set(stepId, result)
  return result
}

export function screenOutputs(screen: Screen): Output[] {
  const outputs: Output[] = []
  for (const el of screen.elements ?? []) {
    if (el.type === 'choice') {
      outputs.push({
        key: el.props.key,
        type: (el.props.multiple ?? false) ? 'choices' : 'choice',
        label: el.props.question,
        elementId: el.id,
        options: (el.props.options ?? []).map(o => ({ id: o.id, label: o.label })),
      })
    } else if (el.type === 'rating') {
      outputs.push({ key: el.props.key, type: 'rating', label: el.props.question, elementId: el.id })
    } else if (el.type === 'form') {
      for (const field of el.props.fields ?? []) {
        outputs.push({ key: field.key, type: fieldOutputType(field.kind), label: field.label, elementId: el.id })
      }
    }
  }
  return outputs
}

export function elementById(screen: Screen, elementId: string): Element | undefined {
  return (screen.elements ?? []).find(el => el.id === elementId)
}
