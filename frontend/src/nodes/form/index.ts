import { formSchema } from './schema'
import type { NodeDefinition } from '../_core/types'
import type { z } from 'zod'
import { FormDevice } from './Device'
import { FormJourneyConfig } from './JourneyConfig'
import { FormStyleConfig } from './StyleConfig'
export const formDefinition: NodeDefinition<z.infer<typeof formSchema>> = {
  type: 'form',
  category: 'interactive',
  icon: 'List',
  accent: 'border-l-green-500',
  schema: formSchema,
  defaultConfig: { fields: [{ id: 'f1', type: 'input', label: 'Field 1', required: false }], submitLabel: 'Submit' },
  renderable: true,
  valueType: true,
  canOwnExit: true,
  exitHandles: ['default'],
  handles: { inputs: 1, outputs: ['default'] },
  Device: FormDevice,
  JourneyConfig: FormJourneyConfig,
  StyleConfig: FormStyleConfig,
} 
