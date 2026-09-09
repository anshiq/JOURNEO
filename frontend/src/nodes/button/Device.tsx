import * as React from 'react'
import type { DeviceProps } from '../_core/device'
import { applyStyle } from '../_core/preview'

export const ButtonDevice: React.FC<DeviceProps> = ({ config, theme, style, onAdvance }) => {
  const cfg = config || {}
  const outline = cfg.variant === 'outline'
  const click = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (cfg.action === 'link' && cfg.href) { window.open(cfg.href, '_blank', 'noopener,noreferrer'); return }
    if (cfg.blockOwnsExit) onAdvance('default')
  }
  const { borderWidth, borderStyle, borderColor, backgroundColor, color, borderRadius, fontFamily, fontSize, ...rest } = applyStyle(style || {}) as any
  return <button type="button" className={`inline-flex min-h-[44px] min-w-0 max-w-full items-center justify-center break-words px-4 py-2 text-sm font-medium sm:px-5 sm:py-2.5 ${cfg.fullWidth ? 'w-full' : ''}`} style={{ ...rest, border: borderWidth ? `${borderWidth} ${borderStyle || 'solid'} ${borderColor || theme.primary}` : outline ? `2px solid ${theme.primary}` : 'none', borderRadius: borderRadius ?? theme.radius, fontFamily: fontFamily || theme.font, fontSize: fontSize || (cfg.size === 'sm' ? 12 : cfg.size === 'lg' ? 'clamp(1rem, 0.9rem + 0.5vw, 1.125rem)' : 'clamp(0.875rem, 0.8rem + 0.4vw, 1rem)'), backgroundColor: backgroundColor || (outline ? 'transparent' : theme.primary), color: color || (outline ? theme.primary : 'white'), whiteSpace: 'normal', textAlign: 'center', lineHeight: 1.4, maxWidth: '100%', minWidth: cfg.fullWidth ? 0 : undefined }} onClick={click}><span className="min-w-0 break-words">{cfg.icon && <span className="mr-1">{cfg.icon}</span>}{cfg.label || 'Button'}</span></button>
}
export default ButtonDevice
