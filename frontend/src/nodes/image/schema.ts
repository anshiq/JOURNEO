import { z } from 'zod'
const imageResponsiveOverrideSchema = z.object({
  src: z.string().optional(),
  alt: z.string().optional(),
  focalPoint: z.string().optional(),
}).partial()
export const imageSchema = z.object({
  src: z.string().min(1),
  alt: z.string().optional().default(''),
  aspectRatio: z.string().optional(),
  focalPoint: z.string().optional(),
  responsive: z.object({
    mobile: imageResponsiveOverrideSchema.optional(),
    tablet: imageResponsiveOverrideSchema.optional(),
    desktop: imageResponsiveOverrideSchema.optional(),
  }).optional(),
})
