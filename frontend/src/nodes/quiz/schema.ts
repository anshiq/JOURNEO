import { z } from 'zod'
export const quizSchema = z.object({
  question: z.string(),
  type: z.enum(['mcq', 'multiple', 'true_false']).default('mcq'),
  options: z.array(z.object({ id: z.string(), label: z.string(), image: z.string().optional(), correct: z.boolean().optional(), score: z.number().optional() })).min(1),
  allowSkip: z.boolean().optional().default(true),
  skipLabel: z.string().optional().default('Skip question'),
  showResult: z.boolean().optional(), submitMode: z.enum(['instant','collect']).optional().default('instant'),
  randomizeOrder: z.boolean().optional(),
  showFeedback: z.boolean().optional(),
})
