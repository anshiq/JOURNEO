import { z } from 'zod'
export const formSchema = z.object({
  fields: z.array(z.object({
    id: z.string(),
    type: z.enum(['input', 'textarea', 'select', 'checkbox', 'radio', 'toggle', 'slider', 'rating', 'file']),
    label: z.string(),
    placeholder: z.string().optional(),
    required: z.boolean().optional(),
    options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  })).min(1),
  submitLabel: z.string().default('Submit'),
})
