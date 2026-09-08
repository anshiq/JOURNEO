import { z } from 'zod'
export const ratingSchema = z.object({
  label: z.string().optional(),
  value: z.number().default(0),
  max: z.number().default(5),
  allowHalf: z.boolean().optional(), required: z.boolean().optional(), defaultValue: z.number().optional(),
})
