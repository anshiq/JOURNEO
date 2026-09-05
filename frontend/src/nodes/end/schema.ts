import { z } from 'zod'
export const endSchema = z.object({
  message: z.string().optional(),
})
