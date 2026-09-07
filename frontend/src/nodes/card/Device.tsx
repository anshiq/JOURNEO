import * as React from 'react'
import type { DeviceProps } from '../_core/device'
export const CardDevice: React.FC<DeviceProps> = ({ config, theme, onAdvance }) => {
  const cfg = config || {}
  return <div className="overflow-hidden">
    {cfg.image?.src && <img src={cfg.image.src} alt={cfg.image.alt || ''} className="w-full" style={{ borderRadius: `${theme.radius}px ${theme.radius}px 0 0`, aspectRatio: cfg.image.aspectRatio || '16/9', objectFit: 'cover' }} />}
    <div className="p-4">
      {cfg.badge && <span className="inline-block px-2 py-0.5 rounded text-xs font-medium mb-2" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>{cfg.badge}</span>}
      {cfg.title && <h3 className="font-semibold mb-1" style={{ fontFamily: theme.font }}>{cfg.title}</h3>}
      {cfg.description && <p className="text-sm opacity-80 mb-3" style={{ fontFamily: theme.font }}>{cfg.description}</p>}
      {cfg.actions?.map((action: any, i: number) => <button key={i} className="text-sm font-medium mr-2" style={{ color: theme.primary }} onClick={(e) => { e.stopPropagation(); onAdvance() }}>{action.label}</button>)}
    </div>
  </div>
}
export default CardDevice
