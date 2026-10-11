export type Vars = Record<string, unknown>

export interface Frame {
  readonly stepId: string
  readonly vars: Vars
}

export interface EngineState {
  readonly stack: readonly Frame[]
  readonly status: 'running' | 'ended' | 'redirect'
  readonly redirect?: { url: string; delayMs: number }
}

export type EngineEvent =
  | { type: 'screen_view'; step: string }
  | { type: 'exit'; step: string; port: string }
  | { type: 'answer'; key: string; value: unknown }
  | { type: 'complete'; step: string }
  | { type: 'engine_error'; reason: 'hop_limit' | 'missing_step' }

export interface Transition {
  state: EngineState
  events: EngineEvent[]
  matched?: { stepId: string; ruleId: string } | undefined
}

export interface EngineContext {
  system: Vars
}

export const HOP_LIMIT = 64
