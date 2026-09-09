import * as React from 'react'
import type { DeviceProps } from '../_core/device'
import { applyStyle } from '../_core/preview'
export const ImageDevice: React.FC<DeviceProps> = ({ config, theme, style }) => {
  const cfg = config || {}
  if (!cfg.src) return <div className="min-w-0 max-w-full break-words border p-3 text-xs" style={{ color: theme.accent, borderColor: theme.accent, backgroundColor: theme.accent + '14', borderRadius: theme.radius, overflowWrap: 'break-word' }}>No image source</div>
  const applied = applyStyle(style || {})
  return <img src={cfg.src} alt={cfg.alt || ''} loading="lazy" decoding="async" className="min-w-0 max-w-full" style={{ borderRadius: (applied as any).borderRadius ?? theme.radius, objectFit: (style as any)?.objectFit || 'cover', aspectRatio: cfg.aspectRatio || undefined, ...applied, display: 'block', width: '100%', maxWidth: '100%', height: 'auto' }} />
}
export default ImageDevice
