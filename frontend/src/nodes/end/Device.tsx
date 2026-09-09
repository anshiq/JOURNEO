import * as React from 'react'
import type { DeviceProps } from '../_core/device'
export const EndDevice: React.FC<DeviceProps> = ({ config, theme, studio, onAdvance }) => {
  const cfg = (config as any) || {}
  return <div className="flex w-full min-w-0 max-w-full flex-col items-center justify-center gap-3 break-words px-4 py-10 text-center" style={{ fontFamily: theme.font, color: theme.foreground, maxWidth: '100%' }}>
    <div className="text-4xl" aria-hidden>🎉</div>
    <div className="min-w-0 max-w-full break-words text-lg font-semibold sm:text-xl" style={{ overflowWrap: 'break-word', wordBreak: 'break-word', lineHeight: 1.35 }}>{cfg.title || 'That\u2019s a wrap'}</div>
    <div className="mx-auto min-w-0 max-w-md break-words text-sm opacity-70" style={{ overflowWrap: 'break-word', lineHeight: 1.6 }}>{cfg.message || 'Thanks for exploring this experience.'}</div>
    {studio && <button onClick={() => onAdvance()} className="mt-2 min-h-[44px] min-w-0 max-w-full break-words rounded px-4 py-1.5 text-xs text-white sm:text-sm" style={{ backgroundColor: theme.primary, borderRadius: theme.radius }}>Play again</button>}
  </div>
}
export default EndDevice
