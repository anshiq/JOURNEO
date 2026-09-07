import * as React from 'react'
import type { JourneyConfigProps } from '../_core/config'
export const ImageJourneyConfig: React.FC<JourneyConfigProps> = () => {
  return <div className="space-y-2"><div className="overflow-hidden rounded-none border bg-muted/30"><svg viewBox="0 0 320 180" className="h-36 w-full" role="img" aria-label="Sample image"><rect x="0" y="0" width="320" height="180" fill="hsl(var(--muted))" /><circle cx="248" cy="48" r="22" fill="hsl(var(--muted-foreground))" opacity="0.35" /><polygon points="0,180 110,70 190,180" fill="hsl(var(--muted-foreground))" opacity="0.3" /><polygon points="110,180 210,50 320,180" fill="hsl(var(--muted-foreground))" opacity="0.45" /><rect x="0" y="0" width="320" height="180" fill="none" stroke="hsl(var(--border))" strokeWidth="2" /></svg></div><p className="text-[11px] text-muted-foreground">Image source and details are managed in Styles.</p></div>
}
export default ImageJourneyConfig
