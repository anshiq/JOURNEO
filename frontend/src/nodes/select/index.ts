import { selectSchema } from './schema'
import type { NodeDefinition } from '../_core/types'
import type { z } from 'zod'
import { SelectDevice } from './Device'
import { SelectJourneyConfig } from './JourneyConfig'
import { SelectStyleConfig } from './StyleConfig'
export const selectDefinition: NodeDefinition<z.infer<typeof selectSchema>> = {
  type: 'select',
  category: 'form',
  icon: 'List',
  accent: 'border-l-blue-500',
  schema: selectSchema,
  defaultConfig: { options: [] },
  handles: { inputs: 1, outputs: ['default'] },
  Device: SelectDevice,
  JourneyConfig: SelectJourneyConfig,
  StyleConfig: SelectStyleConfig,
} 
