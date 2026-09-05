import * as React from 'react'
import type { DeviceProps } from '../_core/device'
import { applyStyle } from '../_core/preview'
export const ContainerDevice: React.FC<DeviceProps> = ({ config, style, theme, onAdvance }) => {
  const cfg = config || {}
  return <div style={{ display: 'flex', flexDirection: cfg.direction || 'column', gap: cfg.gap || '16px', alignItems: cfg.align || 'stretch', justifyContent: cfg.justify || 'start', ...applyStyle(style) }} className="p-4 border border-dashed border-slate-200 rounded-lg"><span className="text-xs text-slate-400">Container ({cfg.direction || 'column'})</span></div>
}
export default ContainerDevice
