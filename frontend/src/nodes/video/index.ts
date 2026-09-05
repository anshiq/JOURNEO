import { videoSchema } from './schema'
import type { NodeDefinition } from '../_core/types'
import type { z } from 'zod'
import { VideoDevice } from './Device'
import { VideoJourneyConfig } from './JourneyConfig'
import { VideoStyleConfig } from './StyleConfig'
export const videoDefinition: NodeDefinition<z.infer<typeof videoSchema>> = {
  type: 'video',
  category: 'content',
  icon: 'Video',
  accent: 'border-l-purple-500',
  schema: videoSchema,
  defaultConfig: { controls: true, showWatchedButton: true, showSkipButton: true, watchedLabel: 'I watched it', skipLabel: 'Skip' },
  handles: { inputs: 1, outputs: ['watched','skipped'] },
  Device: VideoDevice,
  JourneyConfig: VideoJourneyConfig,
  StyleConfig: VideoStyleConfig,
} 
