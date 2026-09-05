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
  defaultConfig: { src: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&q=80', alt: '' },
  renderable: true,
  valueType: false,
  canOwnExit: false,
  exitHandles: ['default'],
  handles: { inputs: 1, outputs: ['default'] },
  Device: ImageDevice,
  JourneyConfig: ImageJourneyConfig,
  StyleConfig: ImageStyleConfig,
} 
