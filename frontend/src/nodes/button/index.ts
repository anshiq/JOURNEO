import { buttonSchema } from './schema'
import type { NodeDefinition } from '../_core/types'
import type { z } from 'zod'
import { ButtonDevice } from './Device'
import { ButtonJourneyConfig } from './JourneyConfig'
import { ButtonStyleConfig } from './StyleConfig'
export const buttonDefinition: NodeDefinition<z.infer<typeof buttonSchema>> = {
  type: 'button',
  category: 'form',
  icon: 'MousePointer',
  accent: 'border-l-indigo-500',
  schema: buttonSchema,
  defaultConfig: { label: 'Button', variant: 'solid', size: 'md' },
  renderable: true,
  valueType: false,
  canOwnExit: true,
  exitHandles: ['default'],
  handles: { inputs: 1, outputs: ['default'] },
  Device: ButtonDevice,
  JourneyConfig: ButtonJourneyConfig,
  StyleConfig: ButtonStyleConfig,
} 
