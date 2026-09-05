import { z } from 'zod'
export const endSchema = z.object({
  message: z.string().optional(),
  redirectUrl: z.string().optional(),
  redirectDelayMs: z.number().optional(),
  responsive: z.object({
    mobile: z.object({ redirectUrl: z.string().optional() }).optional(),
    tablet: z.object({ redirectUrl: z.string().optional() }).optional(),
    desktop: z.object({ redirectUrl: z.string().optional() }).optional(),
  }).optional(),
})
