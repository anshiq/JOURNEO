import { cardSchema } from './schema'
import type { NodeDefinition } from '../_core/types'
import type { z } from 'zod'
import { CardDevice } from './Device'
import { CardJourneyConfig } from './JourneyConfig'
import { CardStyleConfig } from './StyleConfig'
export const cardDefinition: NodeDefinition<z.infer<typeof cardSchema>> = {
  type: 'card',
  category: 'display',
  icon: 'CreditCard',
  accent: 'border-l-blue-500',
  schema: cardSchema,
  defaultConfig: { layout: 'vertical' },
  renderable: true,
  valueType: false,
  canOwnExit: true,
  exitHandles: ['default'],
  handles: { inputs: 1, outputs: ['default'] },
  Device: CardDevice,
  JourneyConfig: CardJourneyConfig,
  StyleConfig: CardStyleConfig,
} 
