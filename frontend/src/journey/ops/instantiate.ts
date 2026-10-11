import type { IdGen } from '../ids'
import type { Element, Screen } from '../model/types'
import { clone, exportSlug, ITEM_ATTR, slugifyKey } from './core'

export interface ElementFragment {
  type: string
  props: Record<string, unknown>
  [key: string]: unknown
}

export interface Recipe {
  id?: string
  name?: string
  layout?: unknown
  elements?: ElementFragment[]
  [key: string]: unknown
}

export function instantiateElement(fragment: ElementFragment | Element, ids: IdGen, keys: Set<string>): Element {
  const el = clone(fragment) as unknown as Record<string, unknown> & { type: string; props: Record<string, unknown> }
  el.id = ids('el')
  const props = el.props
  const meta = ITEM_ATTR[el.type]
  if (meta) {
    for (const item of (props[meta.attr] as Record<string, unknown>[] | undefined) ?? []) item.id = ids(meta.kind)
  }
  if (el.type === 'choice') {
    props.key = slugifyKey(String(props.key || props.question || 'choice'), keys)
    for (const option of (props.options as Record<string, unknown>[] | undefined) ?? [])
      option.value ??= exportSlug(String(option.label ?? 'option'))
  } else if (el.type === 'rating') {
    props.key = slugifyKey(String(props.key || props.question || 'rating'), keys)
  } else if (el.type === 'form') {
    for (const field of (props.fields as Record<string, unknown>[] | undefined) ?? [])
      field.key = slugifyKey(String(field.key || field.label || field.kind || 'field'), keys)
  }
  return el as unknown as Element
}

export function instantiateScreen(recipe: Recipe, ids: IdGen, keys: Set<string>, name?: string): Screen {
  const screen: Record<string, unknown> = {
    id: ids('scr'),
    name: (name ?? recipe.name ?? 'Screen').slice(0, 60),
    layout: clone(recipe.layout ?? { preset: 'stack' }),
    elements: (recipe.elements ?? []).map(el => instantiateElement(el, ids, keys)),
  }
  for (const key of ['background', 'colorScheme', 'stickyAction', 'showAssistant', 'allowBack']) {
    if (key in recipe) screen[key] = clone(recipe[key])
  }
  return screen as unknown as Screen
}

export function reId(screen: Screen, ids: IdGen, keys: Set<string>): Screen {
  const copy = clone(screen) as Screen
  copy.id = ids('scr')
  copy.elements = (copy.elements ?? []).map(el => instantiateElement(el, ids, keys))
  return copy
}
