import { askAiSchema } from './schema'
import type { NodeDefinition } from '../_core/types'
import type { z } from 'zod'
import { AskAiDevice } from './Device'
import { AskAiJourneyConfig } from './JourneyConfig'
import { AskAiStyleConfig } from './StyleConfig'
export const askAiDefinition: NodeDefinition<z.infer<typeof askAiSchema>> = {
  type: 'ask_ai',
  category: 'interactive',
  icon: 'MessageCircle',
  accent: 'border-l-cyan-500',
  schema: askAiSchema,
  defaultConfig: { placeholder: 'Ask anything...', buttonLabel: 'Ask', refusalMessage: 'This question is out of context.', ragK: 8, allowJourneyJump: true, allowRag: true },
  handles: { inputs: 0, outputs: [] },
  Device: AskAiDevice,
  JourneyConfig: AskAiJourneyConfig,
  StyleConfig: AskAiStyleConfig,
}
