import * as React from 'react'
import type { DeviceProps } from '../_core/device'
import { applyStyle } from '../_core/preview'
export const AlertDevice: React.FC<DeviceProps> = ({ config, theme, style }) => {
  const cfg = config || {}
  const tone = (cfg as any).variant === 'error' ? theme.accent : (cfg as any).variant === 'success' ? '#16a34a' : (cfg as any).variant === 'warning' ? '#d97706' : theme.primary
  const applied = applyStyle(style || {})
  return <div className="min-w-0 w-full max-w-full break-words border p-3 sm:p-4" style={{ borderColor: (applied as any).borderColor || tone, backgroundColor: (applied as any).backgroundColor || tone + '14', color: (applied as any).color || theme.foreground, borderRadius: (applied as any).borderRadius ?? theme.radius, fontFamily: (applied as any).fontFamily || theme.font, ...applied, maxWidth: '100%', minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word', boxSizing: 'border-box' }} role="alert"><p className="min-w-0 break-words text-sm leading-relaxed">{cfg.title ? <span className="font-semibold">{cfg.title}: </span> : null}{cfg.message || ''}</p></div>
}
export default AlertDevice
