import { Handle, Position, type NodeProps } from 'reactflow'
import {
  Zap, GitBranch, Flag, MessageCircle,
  Type, Image, Video, MousePointer, Square, List, CheckSquare, Star, Minus, Layout, Bell, CreditCard, Clock, AlertTriangle,
} from 'lucide-react'
import { nodeRegistry } from '../../nodes/_core/registry'
import { cn } from '../../lib/utils'

const ICONS: Record<string, any> = {
  trigger: Zap,
  condition: GitBranch,
  end: Flag,
  ask_ai: MessageCircle,
  text: Type,
  image: Image,
  video: Video,
  button: MousePointer,
  input: Square,
  select: List,
  checkbox: CheckSquare,
  rating: Star,
  container: Layout,
  divider: Minus,
  card: CreditCard,
  hero_section: Image,
  quiz: AlertTriangle,
  form: List,
  countdown: Clock,
  alert: Bell,
  badge: Star,
}
const CATEGORY_FRAME: Record<string, string> = {
  flow: 'border-l-4 border-l-foreground',
  content: 'border-l-2 border-l-foreground',
  form: 'border-l-2 border-l-foreground border-dashed',
  layout: 'border-l border-l-border-strong',
  display: 'border-l-4 border-l-border-strong',
  interactive: 'border-l-2 border-l-border-strong',
}
const CATEGORY_HEADER: Record<string, string> = {
  flow: 'bg-foreground text-background',
  content: 'bg-background text-foreground',
  form: 'bg-secondary text-secondary-foreground',
  layout: 'bg-background text-foreground',
  display: 'bg-secondary text-secondary-foreground',
  interactive: 'bg-foreground text-background',
}
const OUTCOME_HANDLES: Record<string, string[]> = {
  condition: ['true', 'false'],
  quiz: ['answered', 'skipped'],
  video: ['watched', 'skipped'],
}
const FLOATING_NODE_TYPES = ['ask_ai']
function truncate(s: string | undefined, n: number) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n) + '…' : s
}
function Preview({ type, config }: { type: string; config: any }) {
  const cfg = config || {}
  switch (type) {
    case 'trigger':
      return <div className="text-xs text-muted-foreground">Journey entry point</div>
    case 'condition':
      return <div className="font-mono text-xs text-foreground">{cfg.field} {cfg.operator} {JSON.stringify(cfg.value)}</div>
    case 'end':
      return <div className="text-xs text-muted-foreground">Journey end</div>
    case 'text':
      return <div className="text-xs text-foreground">{truncate(cfg.content, 40) || 'Empty'}</div>
    case 'image':
      return cfg.src ? <img src={cfg.src} alt={cfg.alt || ''} className="h-16 w-full rounded-none object-cover" /> : <div className="text-xs text-rouge">no image</div>
    case 'video':
      if (cfg.src) return <video src={cfg.src} muted preload="metadata" className="h-16 w-full rounded-none bg-foreground object-cover" />
      if (cfg.url) return <div className="flex items-center gap-1 text-xs text-muted-foreground"><Video size={12} /> YouTube</div>
      return <div className="text-xs text-rouge">no video</div>
    case 'button':
      return <div className="text-xs text-foreground">{cfg.label || 'Button'}</div>
    case 'input':
      return <div className="text-xs text-muted-foreground">{cfg.placeholder || cfg.label || 'Input'}</div>
    case 'select':
      return <div className="text-xs text-muted-foreground">{(cfg.options || []).length} options</div>
    case 'checkbox':
      return <div className="text-xs text-foreground">{cfg.label || 'Checkbox'}</div>
    case 'rating':
      return <div className="text-xs text-foreground">{'★'.repeat(cfg.value || 0)}</div>
    case 'container':
      return <div className="text-xs text-muted-foreground">{cfg.direction || 'column'} · {cfg.gap || '16px'}</div>
    case 'divider':
      return <div className="text-xs text-muted-foreground">───</div>
    case 'card':
      return <div className="text-xs"><div className="font-medium text-foreground">{truncate(cfg.title, 30)}</div>{cfg.description && <div className="text-muted-foreground">{truncate(cfg.description, 30)}</div>}</div>
    case 'hero_section':
      return <div className="text-xs"><div className="font-bold text-foreground">{truncate(cfg.headline, 40)}</div></div>
    case 'quiz':
      return <div className="text-xs"><div className="text-foreground">{truncate(cfg.question, 40)}</div><div className="text-muted-foreground">{(cfg.options || []).length} options</div></div>
    case 'form':
      return <div className="text-xs text-muted-foreground">{cfg.fields?.length || 0} fields</div>
    case 'countdown':
      return <div className="text-xs text-muted-foreground">Countdown</div>
    case 'alert':
      return <div className="text-xs text-foreground">{cfg.title || cfg.message || 'Alert'}</div>
    case 'badge':
      return <span className="bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{cfg.label || 'Badge'}</span>
    case 'ask_ai':
      return <div className="text-xs text-foreground">{truncate(cfg.placeholder, 40) || 'Ask anything...'}</div>
    default:
      return <div className="text-xs text-muted-foreground">{type}</div>
  }
}
export default function JourneyNodeRenderer({ data, selected }: NodeProps) {
  const type = data.type as string
  const Icon = ICONS[type] || AlertTriangle
  const category = (nodeRegistry as any)[type]?.category || 'content'
  const frame = CATEGORY_FRAME[category] || CATEGORY_FRAME.content
  const header = CATEGORY_HEADER[category] || CATEGORY_HEADER.content
  const handles = OUTCOME_HANDLES[type]
  const isFloating = FLOATING_NODE_TYPES.includes(type)
  const hasError = !!data.hasError
  const isHighlighted = !!data.isHighlighted
  return (
    <div className={cn(
      'journeo-node-frame relative w-56 rounded-none border border-border-strong bg-card transition-colors duration-120 ease-editorial',
      frame,
      selected && 'outline outline-2 outline-foreground outline-offset-2',
      hasError && 'outline outline-2 outline-rouge outline-offset-2',
      isHighlighted && 'outline outline-1 outline-rouge outline-offset-2',
    )}>
      {!isFloating && <Handle type="target" position={Position.Left} className="!border-background !bg-foreground" />}
      <div className={cn('flex items-center gap-2 border-b border-border px-3 py-2', header)}>
        <Icon size={14} className="flex-shrink-0" />
        <span className="text-eyebrow truncate">{type.replace(/_/g, ' ')}</span>
        {isFloating && <span className="text-eyebrow ml-auto border border-border bg-background px-1.5 py-0.5">floating</span>}
        {hasError && <AlertTriangle size={12} className="ml-auto flex-shrink-0 text-rouge" />}
      </div>
      <div className="p-3">
        <Preview type={type} config={data.config} />
      </div>
      {!isFloating && (handles
        ? <div className="flex justify-between px-3 pb-1 font-mono text-[9px] text-muted-foreground">
            {handles.map(h => <span key={h}>{h}</span>)}
          </div>
        : null)}
      {!isFloating && (handles
        ? handles.map((h, i) => (
            <Handle key={h} id={h} type="source" position={Position.Right}
              style={{ top: `${35 + i * 20}%` }} className="!border-background !bg-foreground" />
          ))
        : <Handle type="source" position={Position.Right} className="!border-background !bg-foreground" />)}
    </div>
  )
}
