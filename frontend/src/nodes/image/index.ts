import { imageSchema } from './schema'
import type { NodeDefinition } from '../_core/types'
import type { z } from 'zod'
import { ImageDevice } from './Device'
import { ImageJourneyConfig } from './JourneyConfig'
import { ImageStyleConfig } from './StyleConfig'
export const imageDefinition: NodeDefinition<z.infer<typeof imageSchema>> = {
  type: 'image',
  category: 'content',
  icon: 'Image',
  accent: 'border-l-blue-500',
  schema: imageSchema,
  defaultConfig: { src: '', alt: '' },
  handles: { inputs: 1, outputs: ['default'] },
  Device: ImageDevice,
  JourneyConfig: ImageJourneyConfig,
  StyleConfig: ImageStyleConfig,
} 
