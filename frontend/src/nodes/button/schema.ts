import { z } from 'zod'
export const buttonSchema = z.object({
  label: z.string().default('Button'),
  variant: z.enum(['solid', 'outline', 'ghost', 'soft']).default('solid'),
  size: z.enum(['xs', 'sm', 'md', 'lg']).default('md'),
  icon: z.string().optional(),
  fullWidth: z.boolean().optional(), action: z.enum(['advance','link','submit']).optional(), href: z.string().optional(),
  loading: z.boolean().optional(),
  disabled: z.boolean().optional(),
  analyticsEvent: z.string().optional(),
  responsive: z.object({
    mobile: z.object({ size: z.enum(['xs', 'sm', 'md', 'lg']).optional(), fullWidth: z.boolean().optional() }).optional(),
    tablet: z.object({ size: z.enum(['xs', 'sm', 'md', 'lg']).optional(), fullWidth: z.boolean().optional() }).optional(),
    desktop: z.object({ size: z.enum(['xs', 'sm', 'md', 'lg']).optional(), fullWidth: z.boolean().optional() }).optional(),
  }).optional(),
})
