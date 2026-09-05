import { conditionSchema } from './schema'
import type { NodeDefinition } from '../_core/types'
import type { z } from 'zod'
import { ConditionDevice } from './Device'
import { ConditionJourneyConfig } from './JourneyConfig'
import { ConditionStyleConfig } from './StyleConfig'
export const conditionDefinition: NodeDefinition<z.infer<typeof conditionSchema>> = {
  type: 'condition',
  category: 'flow',
  icon: 'GitBranch',
  accent: 'border-l-purple-500',
  schema: conditionSchema,
  defaultConfig: { field: 'age', operator: 'eq', value: 18 },
  renderable: false,
  valueType: false,
  canOwnExit: false,
  exitHandles: ['true', 'false'],
  handles: { inputs: 1, outputs: ['true','false'] },
  Device: ConditionDevice,
  JourneyConfig: ConditionJourneyConfig,
  StyleConfig: ConditionStyleConfig,
} 
