import { inputSchema } from './schema'
import type { NodeDefinition } from '../_core/types'
import type { z } from 'zod'
import { InputDevice } from './Device'
import { InputJourneyConfig } from './JourneyConfig'
import { InputStyleConfig } from './StyleConfig'
export const inputDefinition: NodeDefinition<z.infer<typeof inputSchema>> = {
  type: 'input',
  category: 'form',
  icon: 'Square',
  accent: 'border-l-blue-500',
  schema: inputSchema,
  defaultConfig: { type: 'text', placeholder: '' },
  handles: { inputs: 1, outputs: ['default'] },
  Device: InputDevice,
  JourneyConfig: InputJourneyConfig,
  StyleConfig: InputStyleConfig,
} 
