import { z } from 'zod'
export const imageSchema = z.object({
  src: z.string().min(1),
  alt: z.string().optional().default(''),
  aspectRatio: z.string().optional(),
})
