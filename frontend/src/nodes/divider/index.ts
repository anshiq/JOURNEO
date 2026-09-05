import { dividerSchema } from './schema'
import type { NodeDefinition } from '../_core/types'
import type { z } from 'zod'
import { DividerDevice } from './Device'
import { DividerJourneyConfig } from './JourneyConfig'
import { DividerStyleConfig } from './StyleConfig'
export const dividerDefinition: NodeDefinition<z.infer<typeof dividerSchema>> = {
  type: 'divider',
  category: 'layout',
  icon: 'Minus',
  accent: 'border-l-slate-300',
  schema: dividerSchema,
  defaultConfig: { orientation: 'horizontal' },
  renderable: true,
  valueType: false,
  canOwnExit: false,
  exitHandles: ['default'],
  handles: { inputs: 1, outputs: ['default'] },
  Device: DividerDevice,
  JourneyConfig: DividerJourneyConfig,
  StyleConfig: DividerStyleConfig,
} 
