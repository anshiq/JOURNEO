import { alertSchema } from './schema'
import type { NodeDefinition } from '../_core/types'
import type { z } from 'zod'
import { AlertDevice } from './Device'
import { AlertJourneyConfig } from './JourneyConfig'
import { AlertStyleConfig } from './StyleConfig'
export const alertDefinition: NodeDefinition<z.infer<typeof alertSchema>> = {
  type: 'alert',
  category: 'content',
  icon: 'Bell',
  accent: 'border-l-yellow-500',
  schema: alertSchema,
  defaultConfig: { variant: 'info', message: 'Important information' },
  renderable: true,
  valueType: false,
  canOwnExit: false,
  exitHandles: ['default'],
  handles: { inputs: 1, outputs: ['default'] },
  Device: AlertDevice,
  JourneyConfig: AlertJourneyConfig,
  StyleConfig: AlertStyleConfig,
} 
