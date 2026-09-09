import { countdownSchema } from './schema'
import type { NodeDefinition } from '../_core/types'
import type { z } from 'zod'
import { CountdownDevice } from './Device'
import { CountdownJourneyConfig } from './JourneyConfig'
import { CountdownStyleConfig } from './StyleConfig'
export const countdownDefinition: NodeDefinition<z.infer<typeof countdownSchema>> = {
  type: 'countdown',
  category: 'interactive',
  icon: 'Clock',
  accent: 'border-l-orange-500',
  schema: countdownSchema,
  defaultConfig: { endTime: new Date(Date.now()+86400000).toISOString(), label: 'Offer ends in', size: 'md', sizeMode: 'auto', showLabel: true, showExpiredMessage: true, onExpire: 'advance' },
  renderable: true,
  valueType: false,
  canOwnExit: true,
  exitHandles: ['default'],
  handles: { inputs: 1, outputs: ['default'] },
  Device: CountdownDevice,
  JourneyConfig: CountdownJourneyConfig,
  StyleConfig: CountdownStyleConfig,
} 
