import { z } from 'zod'
export const cardSchema = z.object({
  layout: z.enum(['vertical', 'horizontal', 'overlay']).default('vertical'),
  image: z.object({ src: z.string().optional(), position: z.enum(['top', 'bottom', 'background']) }).optional(),
  badge: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  actions: z.array(z.object({ label: z.string(), variant: z.enum(['solid', 'outline', 'ghost']), handle: z.string().optional() })).optional(),
})
