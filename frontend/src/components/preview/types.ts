import type { NodeStyle, ThemeConfig } from '../../nodes/_core/types'
export interface FlowNode {
  id: string
  type: string
  label?: string
  config: any
  style?: NodeStyle
  children?: FlowNode[]
}
export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  label?: string
}
export type { ThemeConfig }
export type NodeExecutionStatus = 'active' | 'completed' | 'waiting' | 'disabled'
export interface NodeExecutionState {
  id: string
  stepIndex: number
  stepColor: string
  highlightColor: string
  isActive: boolean
  isPending: boolean
  isDisabled: boolean
  status: NodeExecutionStatus
  label?: string
  nodesInStep?: string[]
}
export interface PreviewExecution {
  currentNodeId: string
  actionLabel: string
  stepIndex: number
  historyIndex: number
  historyLength: number
  states: NodeExecutionState[]
  activeStepNodes: string[]
}
export interface ExecutionSnapshot {
  currentNodeId: string
  visibleNodeIds: Set<string>
  visitedNodeIds: Set<string>
  pendingNodeIds: Set<string>
  nodeStates: Map<string, NodeExecutionState>
  stepIndex: number
  actionLabel: string
}
export const STEP_COLORS = [
  { bg: 'bg-emerald-500', hex: '#22c55e', light: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-white', label: 'Initial reveal' },
  { bg: 'bg-rose-500', hex: '#f43f5e', light: 'bg-rose-100', border: 'border-rose-500', text: 'text-white', label: 'Interaction 1' },
  { bg: 'bg-blue-500', hex: '#3b82f6', light: 'bg-blue-100', border: 'border-blue-500', text: 'text-white', label: 'Interaction 2' },
  { bg: 'bg-violet-500', hex: '#8b5cf6', light: 'bg-violet-100', border: 'border-violet-500', text: 'text-white', label: 'Interaction 3' },
  { bg: 'bg-amber-500', hex: '#f59e0b', light: 'bg-amber-100', border: 'border-amber-500', text: 'text-white', label: 'Interaction 4' },
  { bg: 'bg-cyan-500', hex: '#06b6d4', light: 'bg-cyan-100', border: 'border-cyan-500', text: 'text-white', label: 'Interaction 5' },
  { bg: 'bg-pink-500', hex: '#ec4899', light: 'bg-pink-100', border: 'border-pink-500', text: 'text-white', label: 'Interaction 6' },
  { bg: 'bg-indigo-500', hex: '#6366f1', light: 'bg-indigo-100', border: 'border-indigo-500', text: 'text-white', label: 'Interaction 7' },
]
export const STUDIO_ONLY_NODE_TYPES = ['trigger']
