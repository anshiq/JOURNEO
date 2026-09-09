import { z } from 'zod'
export const ratingSchema = z.object({
  label: z.string().optional(),
  value: z.number().default(0),
  max: z.number().min(1).max(20).default(5),
  allowHalf: z.boolean().optional(), required: z.boolean().optional(), defaultValue: z.number().optional(),
  icon: z.enum(['star', 'heart', 'thumb']).default('star'),
  readOnly: z.boolean().optional(),
})
