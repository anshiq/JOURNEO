import type { Element, StyleProps } from '@journey/model/types'
import type { ComponentType } from 'react'

export type ElementOf<T extends Element['type']> = Extract<Element, { type: T }>

export interface ElementProps<E extends Element = Element> {
  element: E
  style: StyleProps
  labels: Record<string, string>
}

export type ElementComponent<E extends Element = Element> = ComponentType<ElementProps<E>>
