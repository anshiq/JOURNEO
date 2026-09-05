import { heroSectionSchema } from './schema'
import type { NodeDefinition } from '../_core/types'
import type { z } from 'zod'
import { HeroSectionDevice } from './Device'
import { HeroSectionJourneyConfig } from './JourneyConfig'
import { HeroSectionStyleConfig } from './StyleConfig'
export const heroSectionDefinition: NodeDefinition<z.infer<typeof heroSectionSchema>> = {
  type: 'hero_section',
  category: 'display',
  icon: 'Image',
  accent: 'border-l-purple-500',
  schema: heroSectionSchema,
  defaultConfig: { headline: '', ctas: [], imagePosition: 'right' },
  handles: { inputs: 1, outputs: ['default'] },
  Device: HeroSectionDevice,
  JourneyConfig: HeroSectionJourneyConfig,
  StyleConfig: HeroSectionStyleConfig,
} 
