import { z } from 'zod'
export const inputSchema = z.object({
  type: z.enum(['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date', 'color']).default('text'),
  placeholder: z.string().optional(),
  label: z.string().optional(),
  helperText: z.string().optional(), required: z.boolean().optional(), pattern: z.string().optional(), minLength: z.number().optional(), maxLength: z.number().optional(), min: z.number().optional(), max: z.number().optional(), autoComplete: z.string().optional(),
})
