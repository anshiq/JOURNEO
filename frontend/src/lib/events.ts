import type { ViewportId } from './viewports'
import type { PreviewExecution } from '../components/preview/types'
import type { NodeStyle } from '../nodes/_core/types'
export type Events = {
  'campaign:created': { campaignId: string; devToken: string; devLink: string }
  'campaign:devLinkRotated': { campaignId: string; devToken: string }
  'device:viewportChange': { viewportId: ViewportId; width: number; height: number }
  'node:select': { nodeId: string | null; source: 'canvas' | 'device' | 'toolbar' }
  'node:update': { nodeId: string; config?: any; style?: NodeStyle }
  'node:track': { nodeId: string; type: string; handle?: string; viewportId: ViewportId; devToken?: string }
  'execution:change': PreviewExecution & { viewportId: ViewportId }
  'execution:advance': { from: string; to: string; handle?: string }
  'journey:save': { campaignId: string; graph: any }
  'journey:publish': { campaignId: string; journeyId: string }
  'screen:select': { screenId: string | null; source: 'canvas' | 'device' | 'toolbar' }
  'screen:update': { screenId: string; patch: any }
  'block:reorder': { screenId: string; blocks: string[] }
}
