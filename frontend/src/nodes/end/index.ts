import { endSchema } from './schema'
import type { NodeDefinition } from '../_core/types'
import type { z } from 'zod'
import { EndDevice } from './Device'
import { EndJourneyConfig } from './JourneyConfig'
import { EndStyleConfig } from './StyleConfig'
export const endDefinition: NodeDefinition<z.infer<typeof endSchema>> = {
  type: 'end',
  category: 'flow',
  icon: 'Flag',
  accent: 'border-l-slate-500',
  schema: endSchema,
  defaultConfig: {},
  renderable: false,
  valueType: false,
  canOwnExit: false,
  exitHandles: [],
  handles: { inputs: 1, outputs: [] },
  Device: EndDevice,
  JourneyConfig: EndJourneyConfig,
  StyleConfig: EndStyleConfig,
} 
