import { z } from 'zod'
export const alertSchema = z.object({
  variant: z.enum(['info', 'success', 'warning', 'error']).default('info'),
  title: z.string().optional(),
  message: z.string(),
})
