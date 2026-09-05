import { containerSchema } from './schema'
import type { NodeDefinition } from '../_core/types'
import type { z } from 'zod'
import { ContainerDevice } from './Device'
import { ContainerJourneyConfig } from './JourneyConfig'
import { ContainerStyleConfig } from './StyleConfig'
export const containerDefinition: NodeDefinition<z.infer<typeof containerSchema>> = {
  type: 'container',
  category: 'layout',
  icon: 'Layout',
  accent: 'border-l-slate-400',
  schema: containerSchema,
  defaultConfig: { direction: 'column', gap: '16px', align: 'stretch', justify: 'start' },
  handles: { inputs: 1, outputs: ['default'] },
  Device: ContainerDevice,
  JourneyConfig: ContainerJourneyConfig,
  StyleConfig: ContainerStyleConfig,
} 
