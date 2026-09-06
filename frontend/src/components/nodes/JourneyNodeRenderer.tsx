import { Handle, Position, type NodeProps } from 'reactflow'
import {
  Zap, GitBranch, Flag, MessageCircle,
  Type, Image, Video, MousePointer, Square, List, CheckSquare, Star, Minus, Layout, Bell, CreditCard, Clock, AlertTriangle,
} from 'lucide-react'
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
const ACCENT: Record<string, string> = {
  trigger: 'border-l-emerald-500',
  condition: 'border-l-purple-500',
  end: 'border-l-slate-500',
  text: 'border-l-slate-400',
  image: 'border-l-blue-500',
  video: 'border-l-purple-500',
  button: 'border-l-indigo-500',
  input: 'border-l-blue-500',
  select: 'border-l-blue-500',
  checkbox: 'border-l-green-500',
  rating: 'border-l-amber-500',
  container: 'border-l-slate-400',
  divider: 'border-l-slate-300',
  card: 'border-l-blue-500',
  hero_section: 'border-l-purple-500',
  quiz: 'border-l-pink-500',
  form: 'border-l-green-500',
  countdown: 'border-l-orange-500',
  alert: 'border-l-yellow-500',
  badge: 'border-l-indigo-500',
  ask_ai: 'border-l-cyan-500',
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
      return <div className="text-xs text-slate-500">Journey entry point</div>
    case 'condition':
      return <div className="text-xs text-slate-700 font-mono">{cfg.field} {cfg.operator} {JSON.stringify(cfg.value)}</div>
    case 'end':
      return <div className="text-xs text-slate-500">Journey end</div>
    case 'text':
      return <div className="text-xs text-slate-700">{truncate(cfg.content, 40) || 'Empty'}</div>
    case 'image':
      return cfg.src ? <img src={cfg.src} alt={cfg.alt || ''} className="w-full h-16 object-cover rounded" /> : <div className="text-xs text-red-500">no image</div>
    case 'video':
      if (cfg.src) return <video src={cfg.src} muted preload="metadata" className="w-full h-16 object-cover rounded bg-black" />
      if (cfg.url) return <div className="flex items-center gap-1 text-xs text-slate-500"><Video size={12} /> YouTube</div>
      return <div className="text-xs text-red-500">no video</div>
    case 'button':
      return <div className="text-xs text-slate-700">{cfg.label || 'Button'}</div>
    case 'input':
      return <div className="text-xs text-slate-500">{cfg.placeholder || cfg.label || 'Input'}</div>
    case 'select':
      return <div className="text-xs text-slate-500">{(cfg.options || []).length} options</div>
    case 'checkbox':
      return <div className="text-xs text-slate-700">{cfg.label || 'Checkbox'}</div>
    case 'rating':
      return <div className="text-xs text-amber-500">{'★'.repeat(cfg.value || 0)}</div>
    case 'container':
      return <div className="text-xs text-slate-500">{cfg.direction || 'column'} · {cfg.gap || '16px'}</div>
    case 'divider':
      return <div className="text-xs text-slate-400">───</div>
    case 'card':
      return <div className="text-xs"><div className="font-medium text-slate-800">{truncate(cfg.title, 30)}</div>{cfg.description && <div className="text-slate-500">{truncate(cfg.description, 30)}</div>}</div>
    case 'hero_section':
      return <div className="text-xs"><div className="font-bold text-slate-800">{truncate(cfg.headline, 40)}</div></div>
    case 'quiz':
      return <div className="text-xs"><div className="text-slate-700">{truncate(cfg.question, 40)}</div><div className="text-slate-500">{(cfg.options || []).length} options</div></div>
    case 'form':
      return <div className="text-xs text-slate-600">{cfg.fields?.length || 0} fields</div>
    case 'countdown':
      return <div className="text-xs text-slate-600">Countdown</div>
    case 'alert':
      return <div className="text-xs text-slate-700">{cfg.title || cfg.message || 'Alert'}</div>
    case 'badge':
      return <span className="text-xs px-2 py-0.5 rounded bg-slate-100">{cfg.label || 'Badge'}</span>
    case 'ask_ai':
      return <div className="text-xs text-slate-700">{truncate(cfg.placeholder, 40) || 'Ask anything...'}</div>
    default:
      return <div className="text-xs text-slate-400">{type}</div>
  }
}
export default function JourneyNodeRenderer({ data, selected }: NodeProps) {
  const type = data.type as string
  const Icon = ICONS[type] || AlertTriangle
  const accent = ACCENT[type] || 'border-l-slate-400'
  const handles = OUTCOME_HANDLES[type]
  const isFloating = FLOATING_NODE_TYPES.includes(type)
  const hasError = !!data.hasError
  const isHighlighted = !!data.isHighlighted
  return (
    <div className={`relative rounded-lg shadow-sm border bg-white w-56 border-l-4 transition-all duration-150 ${accent} ${selected ? 'ring-2 ring-blue-400' : ''} ${hasError ? 'ring-2 ring-red-400' : ''} ${isHighlighted ? 'ring-2 ring-amber-400 shadow-lg scale-[1.03]' : ''}`}>
      {!isFloating && <Handle type="target" position={Position.Left} className="!bg-slate-400" />}
      <div className="px-3 py-2 flex items-center gap-2 border-b">
        <Icon size={14} className="text-slate-500 flex-shrink-0" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 truncate">{type.replace(/_/g, ' ')}</span>
        {isFloating && <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-600 border border-cyan-200">floating</span>}
        {hasError && <AlertTriangle size={12} className="text-red-500 ml-auto flex-shrink-0" />}
      </div>
      <div className="p-3">
        <Preview type={type} config={data.config} />
      </div>
      {!isFloating && (handles
        ? <div className="flex justify-between px-3 pb-1 text-[9px] text-slate-400">
            {handles.map(h => <span key={h}>{h}</span>)}
          </div>
        : null)}
      {!isFloating && (handles
        ? handles.map((h, i) => (
            <Handle key={h} id={h} type="source" position={Position.Right}
              style={{ top: `${35 + i * 20}%` }} className="!bg-slate-400" />
          ))
        : <Handle type="source" position={Position.Right} className="!bg-slate-400" />)}
    </div>
  )
}
