import { z } from 'zod'
export const textSchema = z.object({
  content: z.string().optional().default(''),
  html: z.string().optional(),
})
