import * as React from 'react'
import type { DeviceProps } from '../_core/device'
export const ButtonDevice: React.FC<DeviceProps> = ({ config, theme, onAdvance }) => {
  const cfg = config || {}
  return <button className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${cfg.fullWidth ? 'w-full' : ''}`} style={{ backgroundColor: (cfg as any).variant === 'outline' ? 'transparent' : theme.primary, border: (cfg as any).variant === 'outline' ? `2px solid ${theme.primary}` : 'none', color: (cfg as any).variant === 'outline' ? theme.primary : 'white', borderRadius: theme.radius, cursor: 'pointer', fontFamily: theme.font }} onClick={(e) => { e.stopPropagation(); onAdvance() }}>{cfg.label || 'Button'}</button>
}
export default ButtonDevice
