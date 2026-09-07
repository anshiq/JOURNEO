import * as React from 'react'
import type { DeviceProps } from '../_core/device'
import { applyStyle } from '../_core/preview'
export const ContainerDevice: React.FC<DeviceProps> = ({ config, style, theme, onAdvance }) => {
  const cfg = config || {}
  return <div style={{ display: 'flex', flexDirection: cfg.direction || 'column', gap: cfg.gap || '16px', alignItems: cfg.align || 'stretch', justifyContent: cfg.justify || 'start', borderColor: theme.foreground + '33', borderRadius: theme.radius, ...applyStyle(style) }} className="p-4 border border-dashed"><span className="text-xs opacity-60">Container ({cfg.direction || 'column'})</span></div>
}
export default ContainerDevice
