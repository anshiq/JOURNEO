import * as React from 'react'
import type { DeviceProps } from '../_core/device'
import { applyStyle } from '../_core/preview'

export const DividerDevice: React.FC<DeviceProps> = ({ config, theme, style }) => {
  const cfg = config || {}
  const applied = applyStyle(style || {})
  if (cfg.orientation === 'vertical') return <div className="mx-2 inline-block h-8 min-w-0 sm:mx-4" style={{ borderLeft: `${cfg.thickness || 1}px ${cfg.variant || 'solid'} ${theme.primary}30`, maxWidth: '100%' }} aria-hidden />
  return <hr className="my-3 w-full min-w-0 max-w-full sm:my-4" style={{ borderColor: theme.primary + '30', borderStyle: cfg.variant || 'solid', borderWidth: `${cfg.thickness || 1}px 0 0`, ...applied, maxWidth: '100%', minWidth: 0 }} aria-hidden />
}
export default DividerDevice
