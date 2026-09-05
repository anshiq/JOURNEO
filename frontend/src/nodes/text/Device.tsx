import * as React from 'react'
import type { DeviceProps } from '../_core/device'
import { applyStyle } from '../_core/preview'
export const TextDevice: React.FC<DeviceProps> = ({ config, theme, style }) => {
  const cfg = config || {}
  return <div style={{ fontFamily: (style as any).fontFamily || theme.font, fontSize: (style as any).fontSize || '14px', color: (style as any).foregroundColor || theme.foreground, textAlign: (style as any).textAlign || 'left', lineHeight: (style as any).lineHeight || '1.5', fontWeight: (style as any).fontWeight || 'normal', ...applyStyle(style) }}>{cfg.content || cfg.html || ''}</div>
}
export default TextDevice
