import * as React from 'react'
import type { DeviceProps } from '../_core/device'
import { youtubeEmbedUrl } from '../_core/preview'
export const VideoDevice: React.FC<DeviceProps> = ({ config, theme, onAdvance }) => {
 const cfg = config || {}
 const continueBtnStyle: React.CSSProperties = { backgroundColor: theme.primary, borderRadius: theme.radius, color: 'white' }
 return <div>
  {cfg.url ? <div className="aspect-video w-full overflow-hidden bg-black" style={{ borderRadius: theme.radius }}><iframe src={youtubeEmbedUrl(cfg.url)} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen /></div> : cfg.src ? <video src={cfg.src} controls className="w-full " style={{ borderRadius: theme.radius }} /> : <div className="text-xs border p-3" style={{ color: theme.accent, borderColor: theme.accent, backgroundColor: theme.accent + '14', borderRadius: theme.radius }}>No video source</div>}
  {(cfg.showWatchedButton || cfg.showSkipButton) && <div className="flex gap-2 mt-3">{cfg.showWatchedButton && <button onClick={(e) => { e.stopPropagation(); onAdvance('watched') }} className="flex-1 text-white text-xs py-2 " style={continueBtnStyle}>{cfg.watchedLabel || 'I watched it'}</button>}{cfg.showSkipButton && <button onClick={(e) => { e.stopPropagation(); onAdvance('skipped') }} className="flex-1 border text-xs py-2 opacity-70" style={{ borderRadius: theme.radius }}>{cfg.skipLabel || 'Skip'}</button>}</div>}
 </div>
}
export default VideoDevice
