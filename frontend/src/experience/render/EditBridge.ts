import type { Element } from '@journey/model/types'
import { createContext, type ReactNode, useContext } from 'react'

export interface EditableText {
  elementId: string
  path: (string | number)[]
  value: string
  rich: 'inline' | 'block' | 'plain'
  fallback: ReactNode
}

export interface EditBridge {
  wrapElement: (element: Element, screenId: string, children: ReactNode, state: { visible: boolean }) => ReactNode
  renderInsert: (screenId: string, index: number) => ReactNode
  renderText?: (text: EditableText) => ReactNode
}

export const EditBridgeContext = createContext<EditBridge | null>(null)

export function useEditBridge(): EditBridge | null {
  return useContext(EditBridgeContext)
}

export function useEditableText(text: EditableText, mode: string): ReactNode {
  const bridge = useContext(EditBridgeContext)
  if (mode !== 'edit' || !bridge?.renderText) return text.fallback
  return bridge.renderText(text)
}
