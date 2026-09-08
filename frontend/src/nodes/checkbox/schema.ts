import { z } from 'zod'
export const checkboxSchema = z.object({
  label: z.string().optional(),
  checked: z.boolean().optional(), defaultChecked: z.boolean().optional(), required: z.boolean().optional(),
})
