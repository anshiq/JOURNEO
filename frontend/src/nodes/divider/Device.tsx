import * as React from 'react'
import type { DeviceProps } from '../_core/device'

export const DividerDevice: React.FC<DeviceProps> = ({ config, theme }) => {
  const cfg = config || {}
  if (cfg.orientation === 'vertical') return <div className="mx-4 inline-block h-8" style={{ borderLeft: `${cfg.thickness || 1}px ${cfg.variant || 'solid'} ${theme.primary}30` }} />
  return <hr className="my-4" style={{ borderColor: theme.primary + '30', borderStyle: cfg.variant || 'solid', borderWidth: `${cfg.thickness || 1}px 0 0` }} />
}
