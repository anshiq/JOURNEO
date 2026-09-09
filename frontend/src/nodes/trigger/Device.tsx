import * as React from 'react'
import type { DeviceProps } from '../_core/device'
export const TriggerDevice: React.FC<DeviceProps> = ({ config, theme, onAdvance }) => {
  const ctaLabel = (config as any)?.ctaLabel || theme.cta
  return <div className="w-full min-w-0 max-w-full break-words px-4 py-10 text-center" style={{ maxWidth: '100%' }}><div className="text-3xl" aria-hidden>📲</div><div className="mt-2 min-w-0 break-words text-lg font-medium sm:text-xl">Journey Started</div><div className="mx-auto mt-1 min-w-0 max-w-md break-words text-xs opacity-70 sm:text-sm">Entry point triggered</div><button onClick={(e) => { e?.stopPropagation(); onAdvance() }} className="mt-4 min-h-[48px] w-full min-w-0 max-w-full break-words px-4 py-2 text-sm text-white sm:text-base" style={{ backgroundColor: theme.primary, borderRadius: theme.radius, overflowWrap: 'break-word', lineHeight: 1.4 }}>{ctaLabel}</button></div>
}
export default TriggerDevice
