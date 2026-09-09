import * as React from 'react'
import type { DeviceProps } from '../_core/device'
import { applyStyle } from '../_core/preview'
import { resolveResponsiveConfig } from '../_core/responsive'
import { useBreakpoint } from '../_core/useBreakpoint'
export const ImageDevice: React.FC<DeviceProps> = ({ config, theme, style }) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const breakpoint = useBreakpoint(containerRef)
  const raw = config || {}
  const cfg = resolveResponsiveConfig(raw, breakpoint)
  if (!cfg.src) return <div ref={containerRef} className="min-w-0 max-w-full break-words border p-3 text-xs" style={{ color: theme.accent, borderColor: theme.accent, backgroundColor: theme.accent + '14', borderRadius: theme.radius, overflowWrap: 'break-word' }}>No image source</div>
  const applied = applyStyle(style || {})
  return <div ref={containerRef} className="min-w-0 max-w-full"><img src={cfg.src} alt={cfg.alt || ''} loading="lazy" decoding="async" className="min-w-0 max-w-full" style={{ borderRadius: (applied as any).borderRadius ?? theme.radius, objectFit: (style as any)?.objectFit || 'cover', objectPosition: cfg.focalPoint || undefined, aspectRatio: cfg.aspectRatio || undefined, ...applied, display: 'block', width: '100%', maxWidth: '100%', height: 'auto' }} /></div>
}
export default ImageDevice
