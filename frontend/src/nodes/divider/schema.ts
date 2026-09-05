import { z } from 'zod'
export const dividerSchema = z.object({
  orientation: z.enum(['horizontal', 'vertical']).default('horizontal'),
  color: z.string().optional(),
})
