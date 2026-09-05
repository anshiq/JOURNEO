import { z } from 'zod'
export const cardSchema = z.object({
  layout: z.enum(['vertical', 'horizontal', 'overlay']).default('vertical'),
  image: z.object({ src: z.string().optional(), position: z.enum(['top', 'bottom', 'background']) }).optional(),
  images: z.array(z.string()).optional(),
  carousel: z.boolean().optional(),
  badge: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  actions: z.array(z.object({ label: z.string(), variant: z.enum(['solid', 'outline', 'ghost']), handle: z.string().optional() })).optional(),
  responsive: z.object({
    mobile: z.object({ layout: z.enum(['vertical', 'horizontal', 'overlay']).optional() }).optional(),
    tablet: z.object({ layout: z.enum(['vertical', 'horizontal', 'overlay']).optional() }).optional(),
    desktop: z.object({ layout: z.enum(['vertical', 'horizontal', 'overlay']).optional() }).optional(),
  }).optional(),
})
