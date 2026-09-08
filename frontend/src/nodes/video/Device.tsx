import * as React from 'react'
import type { DeviceProps } from '../_core/device'
import { youtubeEmbedUrl } from '../_core/preview'

export const VideoDevice: React.FC<DeviceProps> = ({ config, theme, onAdvance }) => {
  const cfg = config || {}
  const buttonStyle: React.CSSProperties = { backgroundColor: theme.primary, borderRadius: theme.radius, color: 'white' }
  return <div>{cfg.url ? <div className="aspect-video w-full overflow-hidden bg-black" style={{ borderRadius: theme.radius }}><iframe src={youtubeEmbedUrl(cfg.url)} className="h-full w-full" allow="autoplay; encrypted-media" allowFullScreen /></div> : cfg.src ? <video src={cfg.src} poster={cfg.poster} autoPlay={Boolean(cfg.autoplay)} loop={Boolean(cfg.loop)} controls={cfg.controls !== false} className="w-full" style={{ borderRadius: theme.radius }} /> : <div className="border p-3 text-xs" style={{ color: theme.accent, borderColor: theme.accent, backgroundColor: theme.accent + '14', borderRadius: theme.radius }}>No video source</div>}{cfg.blockOwnsExit && (cfg.showWatchedButton || cfg.showSkipButton) && <div className="mt-3 flex gap-2">{cfg.showWatchedButton && <button type="button" onClick={e => { e.stopPropagation(); onAdvance('watched') }} className="flex-1 py-2 text-xs text-white" style={buttonStyle}>{cfg.watchedLabel || 'I watched it'}</button>}{cfg.showSkipButton && <button type="button" onClick={e => { e.stopPropagation(); onAdvance('skipped') }} className="flex-1 border py-2 text-xs opacity-70" style={{ borderRadius: theme.radius }}>{cfg.skipLabel || 'Skip'}</button>}</div>}</div>
}
