import { z } from 'zod'
export const badgeSchema = z.object({
  label: z.string(),
  variant: z.enum(['solid', 'soft', 'outline']).default('soft'),
  color: z.string().optional(),
})
