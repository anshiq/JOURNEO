import * as React from 'react'
import type { DeviceProps } from '../_core/device'
import { applyStyle } from '../_core/preview'
export const TextDevice: React.FC<DeviceProps> = ({ config, theme, style }) => {
  const cfg = config || {}
  return <div className="min-w-0 max-w-full break-words" style={{ fontFamily: (style as any).fontFamily || theme.font, fontSize: (style as any).fontSize || 'clamp(0.875rem, 0.8rem + 0.5vw, 1rem)', color: (style as any).foregroundColor || theme.foreground, textAlign: (style as any).textAlign || 'left', lineHeight: (style as any).lineHeight || '1.6', fontWeight: (style as any).fontWeight || 'normal', ...applyStyle(style), overflowWrap: 'break-word', wordBreak: 'break-word', hyphens: 'auto', maxWidth: '100%', minWidth: 0 }}>{cfg.content || cfg.html || ''}</div>
}
export default TextDevice
