import { z } from 'zod'
export const imageSchema = z.object({
  src: z.string(),
  alt: z.string().optional().default(''),
  aspectRatio: z.string().optional(),
})
