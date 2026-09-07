import * as React from 'react'
import type { DeviceProps } from '../_core/device'
export const HeroSectionDevice: React.FC<DeviceProps> = ({ config, theme, onAdvance }) => {
 const cfg = config || {}
 return <div className="text-center py-8 px-4">
  {cfg.badge && <span className="inline-block px-3 py-1 text-xs font-medium mb-4" style={{ backgroundColor: theme.primary + '20', color: theme.primary, borderRadius: theme.radius }}>{cfg.badge}</span>}
  {cfg.headline && <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: theme.font }}>{cfg.headline}</h2>}
  {cfg.subheadline && <p className="opacity-80 mb-4" style={{ fontFamily: theme.font }}>{cfg.subheadline}</p>}
  {cfg.image && <img src={cfg.image} alt="" className="mx-auto mb-4" style={{ maxHeight: '200px' }} />}
  <div className="flex justify-center gap-3">{cfg.ctas?.map((cta: any, i: number) => <button key={i} className="px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: i === 0 ? theme.primary : 'transparent', border: i > 0 ? `2px solid ${theme.primary}` : 'none', color: i > 0 ? theme.primary : 'white', borderRadius: theme.radius }} onClick={(e) => { e.stopPropagation(); onAdvance() }}>{cta.label}</button>)}</div>
 </div>
}
export default HeroSectionDevice
