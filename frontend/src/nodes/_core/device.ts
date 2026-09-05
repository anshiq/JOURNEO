import type { NodeStyle, ThemeConfig } from './types'
export interface DeviceProps<C = any> {
  config: C
  style: NodeStyle
  theme: ThemeConfig
  blockId: string
  value?: any
  error?: string | null
  onChange?: (value: any) => void
  onAdvance: (handle?: string, payload?: any) => void
  isActive?: boolean
  isFlashing?: boolean
  studio?: boolean
  onSelect?: () => void
  profile?: Record<string, any>
  campaignId?: string
}
export type DeviceComponent<C = any> = React.FC<DeviceProps<C>>
