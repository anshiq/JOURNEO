import * as React from 'react'
import type { DeviceProps } from '../_core/device'
import { applyStyle } from '../_core/preview'

function substitute(label: string, profile: Record<string, any>): string {
  return label.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const v = profile?.[key]
    return v === undefined || v === null ? '' : String(v)
  })
}

export const BadgeDevice: React.FC<DeviceProps> = ({ config, theme, style, profile }) => {
  const cfg = config || {}
  const applied = applyStyle(style || {})
  const label = cfg.label ? substitute(cfg.label, profile || {}) : 'Badge'
  return <span className={`inline-flex min-w-0 max-w-full items-center whitespace-normal break-words px-2 py-0.5 text-center text-xs font-medium ${cfg.pulse ? 'animate-pulse' : ''}`} style={{ ...applied, backgroundColor: (applied as any).backgroundColor || theme.primary + '20', color: (applied as any).color || theme.primary, borderRadius: (applied as any).borderRadius ?? theme.radius, maxWidth: '100%', overflowWrap: 'break-word', wordBreak: 'break-word', lineHeight: 1.4 }}>{label}</span>
}
export default BadgeDevice
