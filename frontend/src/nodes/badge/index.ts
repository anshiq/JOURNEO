import { badgeSchema } from './schema'
import type { NodeDefinition } from '../_core/types'
import type { z } from 'zod'
import { BadgeDevice } from './Device'
import { BadgeJourneyConfig } from './JourneyConfig'
import { BadgeStyleConfig } from './StyleConfig'
export const badgeDefinition: NodeDefinition<z.infer<typeof badgeSchema>> = {
  type: 'badge',
  category: 'content',
  icon: 'Tag',
  accent: 'border-l-indigo-500',
  schema: badgeSchema,
  defaultConfig: { label: 'Badge', variant: 'soft' },
  handles: { inputs: 1, outputs: ['default'] },
  Device: BadgeDevice,
  JourneyConfig: BadgeJourneyConfig,
  StyleConfig: BadgeStyleConfig,
} 
