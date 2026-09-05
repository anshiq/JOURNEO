import { viewportSpec, type ViewportId } from '../../lib/viewports'
export default function AdFrame({ viewportId, scale, children }: { viewportId: ViewportId; scale: number; children: React.ReactNode }) {
  const v = viewportSpec(viewportId)
  return (
    <div className="relative shrink-0" style={{ width: Math.max(1, v.width * scale), height: Math.max(1, v.height * scale) }}>
      <div
        className="overflow-hidden rounded-2xl bg-white shadow-xl"
        style={{ width: v.width, height: v.height, transform: `scale(${scale})`, transformOrigin: 'top left', outline: '1px solid hsl(var(--border))', outlineOffset: 0 }}
      >
        {children}
      </div>
    </div>
  )
}
