import type { NodeStyle, ThemeConfig } from './types'
export interface DeviceProps<C = any> {
  config: C
  style: NodeStyle
  theme: ThemeConfig
  isActive?: boolean
  isFlashing?: boolean
  studio?: boolean
  onAdvance: (handle?: string) => void
  onSelect?: () => void
}
export type DeviceComponent<C = any> = React.FC<DeviceProps<C>>
