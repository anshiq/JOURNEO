import type { NodeStyle, ThemeConfig } from './types'
export interface JourneyConfigProps<C = any> {
  config: C
  onChange: (next: C) => void
  errors?: string[]
}
export type JourneyConfigComponent<C = any> = React.FC<JourneyConfigProps<C>>
export interface StyleConfigProps {
  style: NodeStyle
  onChange: (key: keyof NodeStyle, value: any) => void
  theme: ThemeConfig
}
export type StyleConfigComponent = React.FC<StyleConfigProps>
