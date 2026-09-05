import { ratingSchema } from './schema'
import type { NodeDefinition } from '../_core/types'
import type { z } from 'zod'
import { RatingDevice } from './Device'
import { RatingJourneyConfig } from './JourneyConfig'
import { RatingStyleConfig } from './StyleConfig'
export const ratingDefinition: NodeDefinition<z.infer<typeof ratingSchema>> = {
  type: 'rating',
  category: 'form',
  icon: 'Star',
  accent: 'border-l-amber-500',
  schema: ratingSchema,
  defaultConfig: { value: 0, max: 5 },
  handles: { inputs: 1, outputs: ['default'] },
  Device: RatingDevice,
  JourneyConfig: RatingJourneyConfig,
  StyleConfig: RatingStyleConfig,
} 
