import { z } from 'zod'
export const triggerSchema = z.object({
  entryPoint: z.boolean().optional().default(true),
})
