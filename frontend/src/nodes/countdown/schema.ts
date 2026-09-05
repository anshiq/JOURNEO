import { z } from 'zod'
export const countdownSchema = z.object({
  endTime: z.string(),
  label: z.string().optional(),
  size: z.enum(['sm', 'md', 'lg']).default('md'),
  expiredMessage: z.string().optional(),
})
