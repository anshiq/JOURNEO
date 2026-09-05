import { z } from 'zod'
export const checkboxSchema = z.object({
  label: z.string().optional(),
  checked: z.boolean().optional(), defaultChecked: z.boolean().optional(), required: z.boolean().optional(),
  indeterminate: z.boolean().optional(),
  group: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  minSelected: z.number().optional(),
  maxSelected: z.number().optional(),
})
