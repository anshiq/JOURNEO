import { nodeRegistry, allNodeTypes } from './registry'
import type { NodeType } from './types'
export function validateNodeConfig(type: string, config: unknown) {
  const def = (nodeRegistry as any)[type]
  if (!def) return { success: false as const, errors: [`Unknown node type: ${type}`] }
  const res = def.schema.safeParse(config ?? {})
  if (res.success) return { success: true as const, data: res.data }
  return { success: false as const, errors: res.error.issues.map((i: any) => `${i.path.join('.') || 'config'}: ${i.message}`) }
}
export function defaultConfigFor(type: string): Record<string, any> {
  const def = (nodeRegistry as any)[type]
  if (!def) return {}
  return def.defaultConfig ?? {}
}
export function isKnownNodeType(type: string): boolean {
  return allNodeTypes.includes(type as any)
}
