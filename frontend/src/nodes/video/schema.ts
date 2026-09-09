import { z } from 'zod'
const videoResponsiveOverrideSchema = z.object({
  src: z.string().optional(),
  poster: z.string().optional(),
}).partial()
export const videoSchema = z.object({
  src: z.string().optional(),
  url: z.string().optional(),
  poster: z.string().optional(),
  autoplay: z.boolean().optional(),
  loop: z.boolean().optional(),
  controls: z.boolean().optional().default(true),
  showWatchedButton: z.boolean().optional().default(true),
  showSkipButton: z.boolean().optional().default(true),
  watchedLabel: z.string().optional().default('I watched it'),
  skipLabel: z.string().optional().default('Skip'),
  responsive: z.object({
    mobile: videoResponsiveOverrideSchema.optional(),
    tablet: videoResponsiveOverrideSchema.optional(),
    desktop: videoResponsiveOverrideSchema.optional(),
  }).optional(),
})
