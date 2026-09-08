import * as React from 'react'
import type { DeviceProps } from '../_core/device'

export const CardDevice: React.FC<DeviceProps> = ({ config, theme, onAdvance }) => {
  const cfg = config || {}
  return <div className={`overflow-hidden ${cfg.layout === 'horizontal' ? 'flex' : ''}`}>{cfg.image?.src && <img src={cfg.image.src} alt={cfg.image.alt || ''} className={cfg.layout === 'horizontal' ? 'w-1/3 object-cover' : 'w-full'} style={{ borderRadius: cfg.layout === 'horizontal' ? 0 : `${theme.radius}px ${theme.radius}px 0 0`, aspectRatio: cfg.image.aspectRatio || '16/9', objectFit: 'cover', objectPosition: cfg.image.position || 'center' }} />}<div className="p-4">{cfg.badge && <span className="mb-2 inline-block rounded px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>{cfg.badge}</span>}{cfg.title && <h3 className="mb-1 font-semibold" style={{ fontFamily: theme.font }}>{cfg.title}</h3>}{cfg.description && <p className="mb-3 text-sm opacity-80" style={{ fontFamily: theme.font }}>{cfg.description}</p>}{cfg.blockOwnsExit && cfg.actions?.map((action: any, i: number) => <button key={i} type="button" className="mr-2 text-sm font-medium" style={{ color: theme.primary }} onClick={e => { e.stopPropagation(); onAdvance(action.handle || `action-${i}`) }}>{action.label}</button>)}</div></div>
}
