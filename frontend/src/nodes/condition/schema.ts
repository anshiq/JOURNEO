import { z } from 'zod'
const operatorEnum = z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains'])
export const conditionBranchSchema = z.object({
  handle: z.string().min(1),
  label: z.string().optional(),
  operator: operatorEnum.optional(),
  value: z.any().optional(),
})
export const conditionSchema = z.object({
  field: z.string().min(1),
  operator: operatorEnum,
  value: z.any().optional(),
  branches: z.array(conditionBranchSchema).optional(),
  elseHandle: z.string().optional(),
})
