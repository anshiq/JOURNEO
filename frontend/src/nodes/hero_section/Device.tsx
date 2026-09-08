import * as React from 'react'
import type { DeviceProps } from '../_core/device'

export const HeroSectionDevice: React.FC<DeviceProps> = ({ config, theme, onAdvance }) => {
  const cfg = config || {}
  const reverse = cfg.imagePosition === 'left'
  return <div className={`flex items-center gap-4 px-4 py-8 ${reverse ? 'flex-row-reverse' : 'flex-col'}`}>{cfg.badge && <span className="mb-1 inline-block px-3 py-1 text-xs font-medium" style={{ backgroundColor: theme.primary + '20', color: theme.primary, borderRadius: theme.radius }}>{cfg.badge}</span>}<div className="min-w-0 flex-1 text-center">{cfg.headline && <h2 className="mb-2 text-2xl font-bold" style={{ fontFamily: theme.font }}>{cfg.headline}</h2>}{cfg.subheadline && <p className="mb-4 opacity-80" style={{ fontFamily: theme.font }}>{cfg.subheadline}</p>}{cfg.image && <img src={cfg.image} alt="" className="mx-auto mb-4 max-h-[200px]" />}{cfg.blockOwnsExit && <div className="flex justify-center gap-3">{(cfg.ctas || []).map((cta: any, i: number) => <button key={i} type="button" className="px-4 py-2 text-sm font-medium" style={{ backgroundColor: i === 0 ? theme.primary : 'transparent', border: i > 0 ? `2px solid ${theme.primary}` : 'none', color: i > 0 ? theme.primary : 'white', borderRadius: theme.radius }} onClick={e => { e.stopPropagation(); onAdvance(cta.handle || `cta-${i}`) }}>{cta.label}</button>)}</div>}</div></div>
}
