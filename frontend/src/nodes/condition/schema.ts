import { z } from 'zod'
export const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains']),
  value: z.any().optional(),
})
