import * as React from 'react'
import type { DeviceProps } from '../_core/device'

export const CountdownDevice: React.FC<DeviceProps> = ({ config, theme, onAdvance }) => {
  const cfg = config || {}
  const [now, setNow] = React.useState(Date.now())
  const fired = React.useRef(false)
  React.useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  const remainingMs = cfg.endTime ? Math.max(0, new Date(cfg.endTime).getTime() - now) : 0
  React.useEffect(() => { if (remainingMs === 0 && cfg.onExpire === 'advance' && !fired.current) { fired.current = true; onAdvance('default') } }, [remainingMs, cfg.onExpire, onAdvance])
  if (!cfg.endTime) return <div className="py-6 text-center text-xs opacity-70">No end time</div>
  const days = Math.floor(remainingMs / 86400000)
  const hours = Math.floor((remainingMs % 86400000) / 3600000)
  const mins = Math.floor((remainingMs % 3600000) / 60000)
  const secs = Math.floor((remainingMs % 60000) / 1000)
  if (remainingMs === 0) return <div className="py-6 text-center text-sm">{cfg.onExpire === 'message' && (cfg.expiredMessage || 'Offer expired')}</div>
  const size = cfg.size === 'sm' ? 'text-lg' : cfg.size === 'lg' ? 'text-4xl' : 'text-2xl'
  return <div className="py-6 text-center">{cfg.showLabel !== false && <div className="mb-2 text-xs opacity-70">{cfg.label || 'Offer ends in'}</div>}<div className={`font-mono ${size}`}>{days}d {hours}h {mins}m {secs}s</div></div>
}
export default CountdownDevice
