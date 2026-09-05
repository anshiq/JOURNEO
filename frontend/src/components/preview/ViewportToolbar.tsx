import { Smartphone, Tablet, Monitor } from 'lucide-react'
import { DEVICE_VIEWPORTS, VIEWPORT_ORDER, type ViewportId } from '../../lib/viewports'
import { bus } from '../../lib/eventBus'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/Badge'

const ICONS: Record<ViewportId, any> = { iphone14: Smartphone, pixel7: Smartphone, ipadAir: Tablet, desktopHD: Monitor }

export default function ViewportToolbar({ viewportId, onChange, scale }: { viewportId: ViewportId; onChange: (id: ViewportId) => void; scale: number }) {
  const handle = (id: ViewportId) => {
    const v = DEVICE_VIEWPORTS[id]
    onChange(id)
    bus.emit('device:viewportChange', { viewportId: id, width: v.width, height: v.height })
  }
  const active = DEVICE_VIEWPORTS[viewportId]
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 p-1">
      <div className="flex items-center gap-1">
        {VIEWPORT_ORDER.map(id => {
          const Icon = ICONS[id]
          const isActive = viewportId === id
          const name = DEVICE_VIEWPORTS[id].name
          return (
            <button key={id} onClick={() => handle(id)} className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors', isActive ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')} aria-label={`Switch to ${name}`} title={name}>
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{name}</span>
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-2 pr-1">
        <Badge variant="muted" className="font-mono text-[10px]">{active.width}×{active.height}</Badge>
        <Badge variant="muted" className="font-mono text-[10px]">{Math.round(scale * 100)}%</Badge>
      </div>
    </div>
  )
}
