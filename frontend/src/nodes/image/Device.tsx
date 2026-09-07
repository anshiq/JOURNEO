import * as React from 'react'
import type { DeviceProps } from '../_core/device'
export const ImageDevice: React.FC<DeviceProps> = ({ config, theme, style }) => {
 const cfg = config || {}
 if (!cfg.src) return <div className="text-xs border p-3" style={{ color: theme.accent, borderColor: theme.accent, backgroundColor: theme.accent + '14', borderRadius: theme.radius }}>No image source</div>
 return <img src={cfg.src} alt={cfg.alt || ''} style={{ width: '100%', borderRadius: theme.radius, objectFit: (style as any).objectFit || 'cover' }} />
}
export default ImageDevice
