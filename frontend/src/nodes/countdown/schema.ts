import { z } from 'zod'
export const countdownSchema = z.object({
  endTime: z.string(),
  label: z.string().optional(),
  showLabel: z.boolean().optional().default(true),
  size: z.enum(['sm', 'md', 'lg']).default('md'),
  sizeMode: z.enum(['fixed', 'auto']).optional().default('auto'),
  expiredMessage: z.string().optional(),
  showExpiredMessage: z.boolean().optional().default(true), onExpire: z.enum(['advance','message','nothing']).optional().default('advance'),
})
