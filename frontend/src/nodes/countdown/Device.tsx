import * as React from 'react'
import { useEffect, useState } from 'react'
import type { DeviceProps } from '../_core/device'
export const CountdownDevice: React.FC<DeviceProps> = ({ config, theme, onAdvance }) => {
  const cfg = config || {}
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  const endsAt = cfg.endTime
  if (!endsAt) return <div className="text-center py-6"><div className="text-xs text-slate-500">No end time</div><button onClick={() => onAdvance()} className="mt-3 w-full text-white text-sm py-2 rounded-lg" style={{ backgroundColor: theme.primary, borderRadius: theme.radius }}>Continue</button></div>
  const remainingMs = Math.max(0, new Date(endsAt).getTime() - now)
  const days = Math.floor(remainingMs / 86400000)
  const hours = Math.floor((remainingMs % 86400000) / 3600000)
  const mins = Math.floor((remainingMs % 3600000) / 60000)
  const secs = Math.floor((remainingMs % 60000) / 1000)
  const expired = remainingMs === 0
  if (expired) return <div className="text-center py-6">{(cfg.showExpiredMessage ?? true) && <div className="text-sm text-slate-700">{cfg.expiredMessage || 'Offer expired'}</div>}<button onClick={() => onAdvance()} className="mt-3 w-full text-white text-sm py-2 rounded-lg" style={{ backgroundColor: theme.primary, borderRadius: theme.radius }}>Continue</button></div>
  return <div className="text-center py-6">{(cfg.showLabel ?? true) && <div className="text-xs text-slate-500 mb-2">{cfg.label || 'Offer ends in'}</div>}<div className="font-mono text-2xl text-slate-800">{days}d {hours}h {mins}m {secs}s</div><button onClick={() => onAdvance()} className="mt-3 w-full text-white text-sm py-2 rounded-lg" style={{ backgroundColor: theme.primary, borderRadius: theme.radius }}>Continue</button></div>
}
export default CountdownDevice
