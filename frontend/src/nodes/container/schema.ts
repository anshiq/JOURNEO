import { z } from 'zod'
export const containerSchema = z.object({
  direction: z.enum(['row', 'column']).default('column'),
  gap: z.string().default('16px'),
  align: z.enum(['start', 'center', 'end', 'stretch']).default('stretch'),
  justify: z.enum(['start', 'center', 'end', 'between', 'around']).default('start'),
})
