import { z } from 'zod'
export const inputSchema = z.object({
  type: z.enum(['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date', 'color']).default('text'),
  placeholder: z.string().optional(),
  label: z.string().optional(),
  helperText: z.string().optional(),
})
