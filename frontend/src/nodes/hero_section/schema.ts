import { z } from 'zod'
const heroSectionResponsiveOverrideSchema = z.object({
  image: z.string().optional(),
  imagePosition: z.enum(['left', 'right', 'background']).optional(),
}).partial()
export const heroSectionSchema = z.object({
  badge: z.string().optional(),
  headline: z.string(),
  subheadline: z.string().optional(),
  image: z.string().optional(),
  imagePosition: z.enum(['left', 'right', 'background']).default('right'),
  ctas: z.array(z.object({ label: z.string(), variant: z.enum(['solid', 'outline']), handle: z.string().optional() })).optional().default([]),
  responsive: z.object({
    mobile: heroSectionResponsiveOverrideSchema.optional(),
    tablet: heroSectionResponsiveOverrideSchema.optional(),
    desktop: heroSectionResponsiveOverrideSchema.optional(),
  }).optional(),
})
