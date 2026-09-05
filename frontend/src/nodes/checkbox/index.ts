import { checkboxSchema } from './schema'
import type { NodeDefinition } from '../_core/types'
import type { z } from 'zod'
import { CheckboxDevice } from './Device'
import { CheckboxJourneyConfig } from './JourneyConfig'
import { CheckboxStyleConfig } from './StyleConfig'
export const checkboxDefinition: NodeDefinition<z.infer<typeof checkboxSchema>> = {
  type: 'checkbox',
  category: 'form',
  icon: 'CheckSquare',
  accent: 'border-l-green-500',
  schema: checkboxSchema,
  defaultConfig: {},
  handles: { inputs: 1, outputs: ['default'] },
  Device: CheckboxDevice,
  JourneyConfig: CheckboxJourneyConfig,
  StyleConfig: CheckboxStyleConfig,
} 
