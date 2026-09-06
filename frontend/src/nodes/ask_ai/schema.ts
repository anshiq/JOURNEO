import { z } from 'zod'
export const askAiSchema = z.object({
  placeholder: z.string().default('Ask anything...'),
  buttonLabel: z.string().default('Ask'),
  refusalMessage: z.string().default('This question is out of context.'),
  ragK: z.number().min(1).max(12).default(8),
  allowJourneyJump: z.boolean().default(true),
  allowRag: z.boolean().default(true),
})
