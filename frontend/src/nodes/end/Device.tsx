import * as React from 'react'
import type { DeviceProps } from '../_core/device'
import { useBreakpoint } from '../_core/useBreakpoint'
import { resolveResponsiveConfig } from '../_core/responsive'

export const EndDevice: React.FC<DeviceProps> = ({ config, theme, studio, onAdvance }) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const breakpoint = useBreakpoint(containerRef)
  const cfg = resolveResponsiveConfig((config as any) || {}, breakpoint)
  React.useEffect(() => {
    if (!cfg.redirectUrl || studio) return
    const timer = window.setTimeout(() => { window.location.href = cfg.redirectUrl }, cfg.redirectDelayMs ?? 0)
    return () => window.clearTimeout(timer)
  }, [cfg.redirectUrl, cfg.redirectDelayMs, studio])
  return <div ref={containerRef} className="flex w-full min-w-0 max-w-full flex-col items-center justify-center gap-3 break-words px-4 py-10 text-center" style={{ fontFamily: theme.font, color: theme.foreground, maxWidth: '100%' }}>
    <div className="text-4xl" aria-hidden>🎉</div>
    <div className="min-w-0 max-w-full break-words text-lg font-semibold sm:text-xl" style={{ overflowWrap: 'break-word', wordBreak: 'break-word', lineHeight: 1.35 }}>{cfg.title || 'That’s a wrap'}</div>
    <div className="mx-auto min-w-0 max-w-md break-words text-sm opacity-70" style={{ overflowWrap: 'break-word', lineHeight: 1.6 }}>{cfg.message || 'Thanks for exploring this experience.'}</div>
    {studio && <button onClick={() => onAdvance()} className="mt-2 min-h-[44px] min-w-0 max-w-full break-words rounded px-4 py-1.5 text-xs text-white sm:text-sm" style={{ backgroundColor: theme.primary, borderRadius: theme.radius }}>Play again</button>}
  </div>
}
export default EndDevice
