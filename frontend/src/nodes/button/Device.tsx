import * as React from 'react'
import type { DeviceProps } from '../_core/device'

export const ButtonDevice: React.FC<DeviceProps> = ({ config, theme, onAdvance }) => {
  const cfg = config || {}
  const outline = cfg.variant === 'outline'
  const click = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (cfg.action === 'link' && cfg.href) { window.open(cfg.href, '_blank', 'noopener,noreferrer'); return }
    if (cfg.blockOwnsExit) onAdvance('default')
  }
  return <button type="button" className={`px-4 py-2 text-sm font-medium ${cfg.fullWidth ? 'w-full' : ''}`} style={{ backgroundColor: outline ? 'transparent' : theme.primary, border: outline ? `2px solid ${theme.primary}` : 'none', color: outline ? theme.primary : 'white', borderRadius: theme.radius, fontFamily: theme.font, fontSize: cfg.size === 'sm' ? 12 : cfg.size === 'lg' ? 18 : 14 }} onClick={click}>{cfg.icon && <span className="mr-1">{cfg.icon}</span>}{cfg.label || 'Button'}</button>
}
