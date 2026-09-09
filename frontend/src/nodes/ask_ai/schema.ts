import { z } from 'zod'
export const askAiSchema = z.object({
  placeholder: z.string().default('Ask anything...'),
  buttonLabel: z.string().default('Ask'),
  refusalMessage: z.string().default('This question is out of context.'),
  ragK: z.number().min(1).max(12).default(8),
  allowJourneyJump: z.boolean().default(true),
  allowRag: z.boolean().default(true),
  suggestedQuestions: z.array(z.string()).optional(),
  responsivePlacement: z.object({
    mobile: z.enum(['floating', 'pinned']).optional(),
    tablet: z.enum(['floating', 'pinned']).optional(),
    desktop: z.enum(['floating', 'pinned']).optional(),
  }).optional(),
})
