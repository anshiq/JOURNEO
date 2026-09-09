import * as React from 'react'
import type { DeviceProps } from '../_core/device'
import { applyStyle } from '../_core/preview'
import { useBreakpoint } from '../_core/useBreakpoint'
import { resolveResponsiveConfig } from '../_core/responsive'

export const AlertDevice: React.FC<DeviceProps> = ({ config, theme, style, onAdvance }) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const breakpoint = useBreakpoint(containerRef)
  const cfg = resolveResponsiveConfig(config || {}, breakpoint)
  const [dismissed, setDismissed] = React.useState(false)
  React.useEffect(() => {
    if (!cfg.autoDismissMs) return
    const timer = window.setTimeout(() => setDismissed(true), cfg.autoDismissMs)
    return () => window.clearTimeout(timer)
  }, [cfg.autoDismissMs])
  if (dismissed) return null
  const tone = cfg.variant === 'error' ? theme.accent : cfg.variant === 'success' ? '#16a34a' : cfg.variant === 'warning' ? '#d97706' : theme.primary
  const applied = applyStyle(style || {})
  const compact = Boolean(cfg.compact)
  return <div ref={containerRef} className={`min-w-0 w-full max-w-full break-words border ${compact ? 'p-2' : 'p-3 sm:p-4'}`} style={{ borderColor: (applied as any).borderColor || tone, backgroundColor: (applied as any).backgroundColor || tone + '14', color: (applied as any).color || theme.foreground, borderRadius: (applied as any).borderRadius ?? theme.radius, fontFamily: (applied as any).fontFamily || theme.font, ...applied, maxWidth: '100%', minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word', boxSizing: 'border-box' }} role="alert">
    <p className={`min-w-0 break-words leading-relaxed ${compact ? 'text-xs' : 'text-sm'}`}>{cfg.title && !compact ? <span className="font-semibold">{cfg.title}: </span> : null}{cfg.message || ''}</p>
    {cfg.blockOwnsExit && cfg.action?.label && <button type="button" onClick={e => { e.stopPropagation(); onAdvance(cfg.action.handle || 'default') }} className="mt-2 text-xs font-medium underline" style={{ color: tone }}>{cfg.action.label}</button>}
  </div>
}
export default AlertDevice
