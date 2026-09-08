import { z } from 'zod'
export const textSchema = z.object({
  content: z.string().optional().default(''),
  variant: z.enum(['body','lead','caption','quote']).optional(), as: z.enum(['p','h1','h2','h3','h4']).optional(),
})
