import * as React from 'react'
import type { DeviceProps } from '../_core/device'
import { applyStyle } from '../_core/preview'
import { useBreakpoint } from '../_core/useBreakpoint'
import { resolveResponsiveConfig } from '../_core/responsive'

export const DividerDevice: React.FC<DeviceProps> = ({ config, theme, style }) => {
  const containerRef = React.useRef<HTMLElement>(null)
  const breakpoint = useBreakpoint(containerRef)
  const cfg = resolveResponsiveConfig(config || {}, breakpoint)
  const applied = applyStyle(style || {})
  const spacing = cfg.spacing
  if (cfg.orientation === 'vertical') return <div ref={containerRef as any} className="mx-2 inline-block h-8 min-w-0 sm:mx-4" style={{ borderLeft: `${cfg.thickness || 1}px ${cfg.variant || 'solid'} ${theme.primary}30`, maxWidth: '100%', margin: spacing ? `0 ${spacing}` : undefined }} aria-hidden />
  if (cfg.label) return (
    <div ref={containerRef as any} className="flex w-full min-w-0 max-w-full items-center gap-3" style={{ margin: spacing ? `${spacing} 0` : undefined }}>
      <hr className="min-w-0 flex-1" style={{ borderColor: theme.primary + '30', borderStyle: cfg.variant || 'solid', borderWidth: `${cfg.thickness || 1}px 0 0` }} />
      <span className="shrink-0 text-xs opacity-60" style={{ fontFamily: theme.font }}>{cfg.label}</span>
      <hr className="min-w-0 flex-1" style={{ borderColor: theme.primary + '30', borderStyle: cfg.variant || 'solid', borderWidth: `${cfg.thickness || 1}px 0 0` }} />
    </div>
  )
  return <hr ref={containerRef as any} className="w-full min-w-0 max-w-full" style={{ borderColor: theme.primary + '30', borderStyle: cfg.variant || 'solid', borderWidth: `${cfg.thickness || 1}px 0 0`, ...applied, maxWidth: '100%', minWidth: 0, margin: spacing ? `${spacing} 0` : (applied as any).margin ?? '12px 0' }} aria-hidden />
}
export default DividerDevice
