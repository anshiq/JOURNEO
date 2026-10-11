import type { Vars } from '@journey/engine/index'
import { createContext, useContext } from 'react'
import type { Breakpoint } from '../constants'

export type RenderMode = 'live' | 'test' | 'edit' | 'thumbnail'

export interface CtaEvent {
  element: string
  item?: string
  kind: string
  url?: string
}

export interface ScreenRuntime {
  mode: RenderMode
  breakpoint: Breakpoint
  screenId: string
  vars: Vars
  answers: Vars
  errors: Record<string, string>
  busy: boolean
  isFirst: boolean
  setAnswer: (key: string, value: unknown, options?: { advance?: boolean }) => void
  clearError: (key: string) => void
  exit: (port: string, options?: { skipValidation?: boolean }) => void
  submitForm: (elementId: string) => void
  openUrl: (url: string, newTab: boolean, passParams: boolean) => void
  track: (event: CtaEvent) => void
  notify: (message: string) => void
}

export const RuntimeContext = createContext<ScreenRuntime | null>(null)

export function useRuntime(): ScreenRuntime {
  const runtime = useContext(RuntimeContext)
  if (!runtime) throw new Error('ScreenRuntime missing')
  return runtime
}
