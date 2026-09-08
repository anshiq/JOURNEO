import { nodeRegistry, allNodeTypes } from './registry'
import { nodeBlockSchema } from './types'
export function validateNodeConfig(type: string, config: unknown) {
  const def = (nodeRegistry as any)[type]
  if (!def) return { success: false as const, errors: [`Unknown node type: ${type}`] }
  const errors: string[] = []
  const res = def.schema.safeParse(config ?? {})
  if (!res.success) errors.push(...res.error.issues.map((i: any) => `${i.path.join('.') || 'config'}: ${i.message}`))
  const blockRes = nodeBlockSchema.safeParse(config ?? {})
  if (!blockRes.success) errors.push(...blockRes.error.issues.map((i: any) => `${i.path.join('.') || 'config'}: ${i.message}`))
  if (errors.length > 0) return { success: false as const, errors: errors }
  return { success: true as const, data: res.success ? res.data : {} }
}
export function defaultConfigFor(type: string): Record<string, any> {
  const def = (nodeRegistry as any)[type]
  if (!def) return {}
  return def.defaultConfig ?? {}
}
export function isKnownNodeType(type: string): boolean {
  return allNodeTypes.includes(type as any)
}
