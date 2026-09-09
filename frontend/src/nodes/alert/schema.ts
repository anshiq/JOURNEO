import { z } from 'zod'
export const alertSchema = z.object({
  variant: z.enum(['info', 'success', 'warning', 'error']).default('info'),
  title: z.string().optional(),
  message: z.string(),
  autoDismissMs: z.number().optional(),
  action: z.object({ label: z.string(), handle: z.string().optional() }).optional(),
  responsive: z.object({
    mobile: z.object({ compact: z.boolean().optional() }).optional(),
    tablet: z.object({ compact: z.boolean().optional() }).optional(),
    desktop: z.object({ compact: z.boolean().optional() }).optional(),
  }).optional(),
})
