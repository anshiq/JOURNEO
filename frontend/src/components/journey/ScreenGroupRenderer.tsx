import { Handle, NodeResizer, Position, type NodeProps } from 'reactflow'
import { Layers } from 'lucide-react'

export default function ScreenGroupRenderer({ data, selected }: NodeProps) {
  const screen = data.screen || {}
  const exits = data.exits || []
  return (
    <div className={`relative h-full min-h-[120px] min-w-[220px] rounded-none border-2 bg-primary/5 ${selected ? 'border-primary' : 'border-primary/40'}`}>
      <NodeResizer minWidth={220} minHeight={120} isVisible={selected} />
      <Handle type="target" position={Position.Left} className="!border-background !bg-primary" />
      <div className="flex items-center gap-2 border-b border-primary/30 bg-primary/10 px-2 py-1.5 text-xs font-semibold">
        <Layers className="h-3.5 w-3.5" />
        <span className="truncate">{screen.name || 'Screen'}</span>
        <span className="ml-auto text-[10px] font-normal opacity-60">{data.blockCount || 0} blocks</span>
      </div>
      {exits.map((exit: string, i: number) => <Handle key={exit} id={exit} type="source" position={Position.Right} style={{ top: `${Math.min(88, 34 + i * 16)}%` }} className="!border-background !bg-primary" />)}
      <div className="pointer-events-none absolute right-2 top-10 flex flex-col gap-1 text-[9px] text-primary/70">{exits.map((exit: string) => <span key={exit}>{exit}</span>)}</div>
    </div>
  )
}
