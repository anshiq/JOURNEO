import * as React from 'react'
import type { DeviceProps } from '../_core/device'
import { useBreakpoint } from '../_core/useBreakpoint'
import { resolveResponsiveConfig } from '../_core/responsive'

export const CardDevice: React.FC<DeviceProps> = ({ config, theme, onAdvance }) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const breakpoint = useBreakpoint(containerRef)
  const raw = config || {}
  const cfg = resolveResponsiveConfig(raw, breakpoint)
  const horizontal = cfg.layout === 'horizontal'
  const [slide, setSlide] = React.useState(0)
  const images: string[] = Array.isArray(cfg.images) && cfg.images.length > 0 ? cfg.images : cfg.image?.src ? [cfg.image.src] : []
  const showCarousel = Boolean(cfg.carousel) && images.length > 1
  const activeImage = images[Math.min(slide, images.length - 1)]
  return <div ref={containerRef} className={`w-full min-w-0 max-w-full overflow-hidden ${horizontal ? 'flex flex-col sm:flex-row' : 'flex flex-col'}`} style={{ maxWidth: '100%' }}>
    {activeImage && <div className="relative">
      <img src={activeImage} alt={cfg.image?.alt || ''} loading="lazy" decoding="async" className={horizontal ? 'h-40 w-full min-w-0 object-cover sm:h-auto sm:w-1/3 sm:min-w-0' : 'h-auto w-full min-w-0 max-w-full object-cover'} style={{ borderRadius: horizontal ? 0 : `${theme.radius}px ${theme.radius}px 0 0`, aspectRatio: horizontal ? undefined : cfg.image?.aspectRatio || '16/9', objectFit: 'cover', objectPosition: cfg.image?.position || 'center', maxWidth: '100%' }} />
      {showCarousel && <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
        {images.map((_, i) => <button key={i} type="button" onClick={e => { e.stopPropagation(); setSlide(i) }} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: i === slide ? theme.primary : 'rgba(255,255,255,0.6)' }} />)}
      </div>}
    </div>}
    <div className="min-w-0 max-w-full flex-1 p-4 sm:p-5">
      {cfg.badge && <span className="mb-2 inline-block min-w-0 max-w-full break-words rounded px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: theme.primary + '20', color: theme.primary, overflowWrap: 'break-word' }}>{cfg.badge}</span>}
      {cfg.title && <h3 className="mb-1 min-w-0 break-words font-semibold" style={{ fontFamily: theme.font, overflowWrap: 'break-word', wordBreak: 'break-word', lineHeight: 1.35 }}>{cfg.title}</h3>}
      {cfg.description && <p className="mb-3 min-w-0 break-words text-sm leading-relaxed opacity-80" style={{ fontFamily: theme.font, overflowWrap: 'break-word', wordBreak: 'break-word' }}>{cfg.description}</p>}
      {cfg.blockOwnsExit && <div className="flex min-w-0 max-w-full flex-wrap gap-x-3 gap-y-2">{cfg.actions?.map((action: any, i: number) => <button key={i} type="button" className="min-h-[44px] min-w-0 max-w-full break-words py-1 text-left text-sm font-medium" style={{ color: theme.primary, overflowWrap: 'break-word' }} onClick={e => { e.stopPropagation(); onAdvance(action.handle || `action-${i}`) }}>{action.label}</button>)}</div>}
    </div>
  </div>
}
export default CardDevice
