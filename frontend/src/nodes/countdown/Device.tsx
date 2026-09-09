import * as React from 'react'
import type { DeviceProps } from '../_core/device'
import { useBreakpoint } from '../_core/useBreakpoint'

const AUTO_SIZE = { mobile: 'sm', tablet: 'md', desktop: 'lg' } as const

export const CountdownDevice: React.FC<DeviceProps> = ({ config, theme, onAdvance }) => {
  const cfg = config || {}
  const containerRef = React.useRef<HTMLDivElement>(null)
  const breakpoint = useBreakpoint(containerRef)
  const resolvedSize = (cfg.sizeMode ?? 'auto') === 'auto' ? AUTO_SIZE[breakpoint] : cfg.size
  const [now, setNow] = React.useState(Date.now())
  const fired = React.useRef(false)
  React.useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  const remainingMs = cfg.endTime ? Math.max(0, new Date(cfg.endTime).getTime() - now) : 0
  React.useEffect(() => { if (remainingMs === 0 && cfg.onExpire === 'advance' && !fired.current) { fired.current = true; onAdvance('default') } }, [remainingMs, cfg.onExpire, onAdvance])
  if (!cfg.endTime) return <div ref={containerRef} className="w-full min-w-0 max-w-full break-words py-6 text-center text-xs opacity-70 sm:text-sm">No end time</div>
  const days = Math.floor(remainingMs / 86400000)
  const hours = Math.floor((remainingMs % 86400000) / 3600000)
  const mins = Math.floor((remainingMs % 3600000) / 60000)
  const secs = Math.floor((remainingMs % 60000) / 1000)
  if (remainingMs === 0) return <div ref={containerRef} className="w-full min-w-0 max-w-full break-words py-6 text-center text-sm sm:text-base">{cfg.onExpire === 'message' && (cfg.expiredMessage || 'Offer expired')}</div>
  const size = resolvedSize === 'sm' ? 'text-xl sm:text-2xl' : resolvedSize === 'lg' ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'
  const units = [{ v: days, u: 'd' }, { v: hours, u: 'h' }, { v: mins, u: 'm' }, { v: secs, u: 's' }]
  return <div ref={containerRef} className="w-full min-w-0 max-w-full break-words py-6 text-center" style={{ maxWidth: '100%' }}>{cfg.showLabel !== false && <div className="mb-2 min-w-0 break-words px-2 text-xs opacity-70 sm:text-sm">{cfg.label || 'Offer ends in'}</div>}<div className={`flex min-w-0 max-w-full flex-wrap items-baseline justify-center gap-x-2 gap-y-1 font-mono tabular-nums ${size}`} aria-live="polite">{units.map(({ v, u }) => <span key={u} className="whitespace-nowrap">{v}{u}</span>)}</div></div>
}
export default CountdownDevice
