import { quizSchema } from './schema'
import type { NodeDefinition } from '../_core/types'
import type { z } from 'zod'
import { QuizDevice } from './Device'
import { QuizJourneyConfig } from './JourneyConfig'
import { QuizStyleConfig } from './StyleConfig'
export const quizDefinition: NodeDefinition<z.infer<typeof quizSchema>> = {
  type: 'quiz',
  category: 'interactive',
  icon: 'HelpCircle',
  accent: 'border-l-pink-500',
  schema: quizSchema,
  defaultConfig: { question: 'Question', options: [{ id: 'o1', label: 'Option 1' }], type: 'mcq', allowSkip: true, skipLabel: 'Skip question', submitMode: 'instant' },
  renderable: true,
  valueType: true,
  canOwnExit: true,
  exitHandles: ['answered', 'skipped'],
  handles: { inputs: 1, outputs: ['answered','skipped'] },
  Device: QuizDevice,
  JourneyConfig: QuizJourneyConfig,
  StyleConfig: QuizStyleConfig,
} 
