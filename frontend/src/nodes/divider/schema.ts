import { z } from 'zod'
export const dividerSchema = z.object({
  orientation: z.enum(['horizontal', 'vertical']).default('horizontal'),
  color: z.string().optional(),
  label: z.string().optional(),
  responsive: z.object({
    mobile: z.object({ spacing: z.string().optional() }).optional(),
    tablet: z.object({ spacing: z.string().optional() }).optional(),
    desktop: z.object({ spacing: z.string().optional() }).optional(),
  }).optional(),
})
