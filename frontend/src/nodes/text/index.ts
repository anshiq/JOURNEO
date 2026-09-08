import { textSchema } from './schema'
import type { NodeDefinition } from '../_core/types'
import type { z } from 'zod'
import { TextDevice } from './Device'
import { TextJourneyConfig } from './JourneyConfig'
import { TextStyleConfig } from './StyleConfig'
export const textDefinition: NodeDefinition<z.infer<typeof textSchema>> = {
  type: 'text',
  category: 'content',
  icon: 'Type',
  accent: 'border-l-slate-400',
  schema: textSchema,
  defaultConfig: { content: '' },
  renderable: true,
  valueType: false,
  canOwnExit: false,
  exitHandles: ['default'],
  handles: { inputs: 1, outputs: ['default'] },
  Device: TextDevice,
  JourneyConfig: TextJourneyConfig,
  StyleConfig: TextStyleConfig,
} 
