import * as React from 'react'
import type { DeviceProps } from '../_core/device'
import { youtubeEmbedUrl } from '../_core/preview'
export const VideoDevice: React.FC<DeviceProps> = ({ config, theme, onAdvance }) => {
  const cfg = config || {}
  const continueBtnStyle: React.CSSProperties = { backgroundColor: theme.primary, borderRadius: theme.radius, color: 'white' }
  return <div>
    {cfg.url ? <div className="aspect-video w-full rounded-lg overflow-hidden bg-black" style={{ borderRadius: theme.radius }}><iframe src={youtubeEmbedUrl(cfg.url)} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen /></div> : cfg.src ? <video src={cfg.src} controls className="w-full rounded-lg" style={{ borderRadius: theme.radius }} /> : <div className="text-xs text-red-500 border border-red-200 bg-red-50 rounded-lg p-3">No video source</div>}
    {(cfg.showWatchedButton || cfg.showSkipButton) && <div className="flex gap-2 mt-3">{cfg.showWatchedButton && <button onClick={(e) => { e.stopPropagation(); onAdvance('watched') }} className="flex-1 text-white text-xs py-2 rounded-lg" style={continueBtnStyle}>{cfg.watchedLabel || 'I watched it'}</button>}{cfg.showSkipButton && <button onClick={(e) => { e.stopPropagation(); onAdvance('skipped') }} className="flex-1 border text-xs py-2 rounded-lg text-slate-500" style={{ borderRadius: theme.radius }}>{cfg.skipLabel || 'Skip'}</button>}</div>}
  </div>
}
export default VideoDevice
