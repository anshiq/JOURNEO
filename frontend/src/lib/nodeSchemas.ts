export { nodeRegistry, allNodeTypes, nodeCategories, nodeInfo, branchCapableNodeTypes, getDefinition, getSchema, getDefaultConfig, getDevice, getJourneyConfig, getStyleConfig } from '../nodes/_core/registry'
export type { NodeType } from '../nodes/_core/registry'
export { styleSchema, type NodeStyle, type ThemeConfig } from '../nodes/_core/types'
export { validateNodeConfig, defaultConfigFor, isKnownNodeType } from '../nodes/_core/helpers'
import { nodeRegistry } from '../nodes/_core/registry'
export const nodeConfigSchemaByType: Record<string, any> = Object.fromEntries(Object.entries(nodeRegistry).map(([k,v]: any)=>[k, v.schema]))
export type NodeConfigUI =
  | { kind: 'text'; label?: string; description?: string; placeholder?: string; multiline?: boolean; hidden?: boolean }
  | { kind: 'number'; label?: string; description?: string; min?: number; max?: number; step?: number; placeholder?: string; hidden?: boolean }
  | { kind: 'boolean'; label?: string; description?: string; hidden?: boolean }
  | { kind: 'select'; label?: string; description?: string; options: Array<{ value: string; label: string }>; hidden?: boolean }
  | { kind: 'color'; label?: string; description?: string; hidden?: boolean }
  | { kind: 'imageUrl'; label?: string; description?: string; hidden?: boolean }
  | { kind: 'videoUrl'; label?: string; description?: string; hidden?: boolean }
  | { kind: 'dateTime'; label?: string; description?: string; hidden?: boolean }
  | { kind: 'conditionValue'; label?: string; description?: string; hidden?: boolean }
  | { kind: 'statsValue'; label?: string; description?: string; hidden?: boolean }
  | { kind: 'section'; title: string; description?: string; fields: string[] }
export const nodeConfigUIByType: Record<string, Record<string, NodeConfigUI>> = {}
export const nodeConfigSectionsByType: Record<string, Array<{ title: string; fields: string[] }>> = {}
