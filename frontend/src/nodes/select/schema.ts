import { z } from 'zod'
export const selectSchema = z.object({
  placeholder: z.string().optional(),
  label: z.string().optional(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).min(1),
  searchable: z.boolean().optional(),
})
