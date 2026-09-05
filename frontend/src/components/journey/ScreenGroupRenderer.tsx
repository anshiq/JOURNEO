import { Handle, NodeResizer, Position, type NodeProps } from 'reactflow'
import { Layers, Plus, Trash2 } from 'lucide-react'

const QUICK_ADD = ['text', 'image', 'button'] as const

export default function ScreenGroupRenderer({ data, selected }: NodeProps) {
  const screen = data.screen || {}
  const exits = data.exits || []
  const isDropTarget = Boolean((data as any).isDropTarget)
  const isSelectedScreen = Boolean((data as any).isSelectedScreen)
  const active = selected || isSelectedScreen || isDropTarget
  return (
    <div className={`group/screen relative h-full min-h-[120px] min-w-[220px] rounded-none border-2 bg-primary/5 transition-colors ${active ? 'border-primary' : 'border-primary/40'} ${isDropTarget ? 'ring-2 ring-primary ring-offset-2 bg-primary/10' : ''}`}>
      <NodeResizer minWidth={220} minHeight={120} isVisible={selected} />
      <Handle type="target" position={Position.Left} className="!border-background !bg-primary" />
      <div className="flex items-center gap-2 border-b border-primary/30 bg-primary/10 px-2 py-1.5 text-xs font-semibold">
        <Layers className="h-3.5 w-3.5" />
        <span className="truncate">{screen.name || 'Screen'}</span>
        <span className="ml-auto text-[10px] font-normal opacity-60">{data.blockCount || 0} blocks</span>
        {(data as any).onDelete && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); (data as any).onDelete() }}
            className="nodrag flex h-5 w-5 shrink-0 items-center justify-center text-primary/60 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover/screen:opacity-100 data-[selected=true]:opacity-100"
            data-selected={selected}
            aria-label="Delete screen"
            title="Delete screen"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      {exits.map((exit: string, i: number) => <Handle key={exit} id={exit} type="source" position={Position.Right} style={{ top: `${Math.min(88, 34 + i * 16)}%` }} className="!border-background !bg-primary" />)}
      <div className="pointer-events-none absolute right-2 top-10 flex flex-col gap-1 text-[9px] text-primary/70">{exits.map((exit: string) => <span key={exit}>{exit}</span>)}</div>
      {isDropTarget && (
        <div className="pointer-events-none absolute inset-x-2 bottom-10 top-12 flex items-center justify-center rounded-none border-2 border-dashed border-primary/70 bg-primary/10 text-xs font-medium text-primary">
          Drop to add to {screen.name || 'screen'}
        </div>
      )}
      {(data as any).onAddBlock && (
        <div className="nodrag absolute inset-x-0 bottom-0 flex items-center gap-1 border-t border-primary/30 bg-background/95 px-2 py-1">
          <Plus className="h-3 w-3 shrink-0 text-muted-foreground" />
          {QUICK_ADD.map(t => (
            <button
              key={t}
              type="button"
              onClick={e => { e.stopPropagation(); (data as any).onAddBlock(t) }}
              className="rounded-none border border-border/60 px-1.5 py-0.5 text-[10px] text-foreground/80 transition-colors hover:border-foreground hover:bg-secondary"
              title={`Add ${t} to this screen`}
            >
              {t}
            </button>
          ))}
          <span className="ml-auto hidden text-[9px] text-muted-foreground xl:inline">drag any palette item here</span>
        </div>
      )}
    </div>
  )
}
