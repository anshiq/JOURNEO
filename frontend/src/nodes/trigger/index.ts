import { triggerSchema } from './schema'
import type { NodeDefinition } from '../_core/types'
import type { z } from 'zod'
import { TriggerDevice } from './Device'
import { TriggerJourneyConfig } from './JourneyConfig'
import { TriggerStyleConfig } from './StyleConfig'
export const triggerDefinition: NodeDefinition<z.infer<typeof triggerSchema>> = {
  type: 'trigger',
  category: 'flow',
  icon: 'Zap',
  accent: 'border-l-emerald-500',
  schema: triggerSchema,
  defaultConfig: { entryPoint: true },
  renderable: false,
  valueType: false,
  canOwnExit: false,
  exitHandles: ['default'],
  handles: { inputs: 0, outputs: ['default'] },
  Device: TriggerDevice,
  JourneyConfig: TriggerJourneyConfig,
  StyleConfig: TriggerStyleConfig,
} 
