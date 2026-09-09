import * as React from 'react'
import { Loader2, MessageCircle, Pencil, Pin, X } from 'lucide-react'
import type { LiveSessionClient, StartParams } from '../../lib/liveSession'
import { newMessageId, threadKeyFor, useAskAiStore } from '../../lib/askAiThread'
import { useBreakpoint } from '../../nodes/_core/useBreakpoint'
import type { Breakpoint } from '../../nodes/_core/types'

interface OverlayTheme { primary: string; surface: string; foreground: string; radius: number; font: string }
const FALLBACK_THEME: OverlayTheme = { primary: '#000000', surface: '#FFFFFF', foreground: '#111111', radius: 0, font: 'Inter' }

export default function AskAiOverlay({ client, config, sessionStatus, theme, start, screenId, breakpoint: breakpointProp }: { client: LiveSessionClient; config: any; sessionStatus: string; theme?: OverlayTheme; start: StartParams; screenId?: string; breakpoint?: Breakpoint }) {
  const t = theme || FALLBACK_THEME
  const cfg = config || {}
  const fallbackBreakpoint = useBreakpoint(React.useRef(null), breakpointProp === undefined)
  const breakpoint = breakpointProp ?? fallbackBreakpoint
  const placement = cfg.responsivePlacement?.[breakpoint] || (cfg.pinnedPanel ? 'pinned' : 'floating')
  const isPinned = placement === 'pinned' && breakpoint !== 'mobile'
  const key = threadKeyFor(start.mode, start.campaignId, start.journeyId)
  const thread = useAskAiStore(state => state.threads[key])
  const ensure = useAskAiStore(state => state.ensure)
  const append = useAskAiStore(state => state.append)
  const patch = useAskAiStore(state => state.patchMessage)
  const setOpen = useAskAiStore(state => state.setOpen)
  const clear = useAskAiStore(state => state.clear)
  const [input, setInput] = React.useState('')
  const [editing, setEditing] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(0)
  React.useEffect(() => { ensure(key, cfg.historyLimit || 100); client.setMaxConcurrentQueries(cfg.maxConcurrentQueries || 3) }, [client, ensure, key, cfg.historyLimit, cfg.maxConcurrentQueries])
  const open = Boolean(thread?.open)
  const ready = sessionStatus === 'screen' || sessionStatus === 'ended'
  const submit = async () => {
    const query = input.trim()
    if (!query || !ready) return
    const queryId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : newMessageId()
    const sessionId = client.state.status === 'screen' || client.state.status === 'ended' ? client.state.sessionId : ''
    const limit = cfg.historyLimit || 100
    append(key, { id: newMessageId(), queryId, role: 'user', text: query, screenId, sessionId, ts: Date.now(), status: 'done' }, limit)
    const assistantId = newMessageId()
    append(key, { id: assistantId, queryId, role: 'assistant', text: '', screenId, sessionId, ts: Date.now(), status: 'pending' }, limit)
    setInput('')
    setBusy(n => n + 1)
    try {
      const pending = client.sendQuery(query, { queryId, screenId })
      const result = await pending.promise
      const text = result.answer || result.targetNodeDetails?.title || cfg.refusalMessage || 'No answer found.'
      patch(key, assistantId, { text, result, targetNodeId: result.targetNodeId || undefined, status: 'done' }, limit)
    } catch (e: any) {
      patch(key, assistantId, { text: e?.message || 'Query failed', error: e?.message || 'Query failed', status: 'error' }, limit)
    } finally {
      setBusy(n => Math.max(0, n - 1))
    }
  }
  if (cfg.enabled === false) return null
  if (!open) return <button onClick={() => { ensure(key, cfg.historyLimit || 100); setOpen(key, true) }} className="absolute bottom-4 right-4 z-20 flex h-12 w-12 max-w-[calc(100%-2rem)] items-center justify-center text-white" style={{ backgroundColor: t.primary, borderRadius: t.radius, fontFamily: t.font }} title="Ask AI"><MessageCircle size={20} />{thread?.unread ? <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-600 px-1 text-[9px]">{thread.unread}</span> : null}</button>
  const staticSuggestions: string[] = Array.isArray(cfg.suggestedQuestions) ? cfg.suggestedQuestions : []
  const lastAssistant = [...(thread?.messages || [])].reverse().find(m => m.role === 'assistant' && m.status === 'done')
  const dynamicSuggestions: string[] = Array.isArray(lastAssistant?.result?.suggestedQuestions) ? lastAssistant!.result!.suggestedQuestions! : []
  const suggestions = dynamicSuggestions.length > 0 ? dynamicSuggestions : staticSuggestions
  return (
    <div className={isPinned ? 'absolute right-0 top-0 z-20 flex h-full w-[min(22rem,100%)] min-w-0 flex-col overflow-hidden border-l' : breakpoint === 'mobile' ? 'absolute bottom-3 right-3 z-20 flex max-h-[38vh] w-[min(18rem,calc(100%-1.5rem))] min-w-0 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden border' : 'absolute bottom-4 right-4 z-20 flex max-h-[60vh] w-[min(20rem,calc(100%-2rem))] min-w-0 max-w-[calc(100%-2rem)] flex-col overflow-hidden border'} style={{ backgroundColor: t.surface, color: t.foreground, borderColor: t.primary, borderRadius: isPinned ? 0 : t.radius, fontFamily: t.font }}>
      <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: t.primary + '33' }}><MessageCircle size={14} /><span className="text-xs font-semibold">Ask AI</span><span className="ml-auto text-[10px] opacity-60">{thread?.messages.filter(m => m.pinned).length || 0} pinned</span>{<button onClick={() => setOpen(key, false)} className="opacity-60 hover:opacity-100"><X size={14} /></button>}</div>
      <div data-ask-ai-messages className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden overscroll-contain p-3" aria-live="polite">
        {(thread?.messages || []).map(message => (
          <div key={message.id} className={message.role === 'user' ? 'ml-4 border px-2 py-1.5 text-xs sm:ml-8' : 'mr-2 border px-2 py-1.5 text-xs'} style={{ borderColor: t.primary + '33', borderRadius: t.radius, opacity: message.status === 'error' ? 0.65 : 1, overflowWrap: 'break-word', wordBreak: 'break-word', minWidth: 0 }}>
            <div className="mb-1 text-[9px] uppercase opacity-50">{message.role}</div>
            {message.status === 'pending' ? <Loader2 size={14} className="animate-spin" /> : editing === message.id ? <textarea autoFocus value={message.editedText ?? message.text} onChange={e => patch(key, message.id, { editedText: e.target.value }, cfg.historyLimit || 100)} onBlur={() => setEditing(null)} className="w-full min-w-0 border p-1 text-xs" /> : <div className="whitespace-pre-wrap break-words">{message.editedText ?? message.text}</div>}
            {message.role === 'assistant' && message.status !== 'pending' && <div className="mt-1 flex items-center gap-2 text-[10px] opacity-60"><button onClick={() => patch(key, message.id, { pinned: !message.pinned }, cfg.historyLimit || 100)}><Pin size={11} className={message.pinned ? 'fill-current' : ''} /></button>{cfg.allowAdjust !== false && <button onClick={() => setEditing(message.id)}><Pencil size={11} /></button>}{message.result?.targetNodeId && <button onClick={() => client.sendGoto({ nodeId: message.result.targetNodeId })}>Go there</button>}</div>}
          </div>
        ))}
        {(!thread?.messages.length || dynamicSuggestions.length > 0) && suggestions.length > 0 && <div className="flex flex-wrap gap-1.5">{suggestions.map((q, i) => <button key={i} onClick={() => setInput(q)} className="border px-2 py-1 text-[11px]" style={{ borderColor: t.primary + '40', borderRadius: t.radius }}>{q}</button>)}</div>}
      </div>
      <div className="border-t p-2" style={{ borderColor: t.primary + '33' }}><div className="flex gap-2"><input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void submit() }} placeholder={cfg.placeholder || 'Ask anything...'} disabled={!ready} className="h-8 min-w-0 flex-1 border px-2 text-xs" style={{ borderRadius: t.radius, borderColor: t.primary + '55', backgroundColor: t.surface, color: t.foreground }} /><button onClick={() => void submit()} disabled={!ready || !input.trim()} className="px-2 text-xs text-white disabled:opacity-50" style={{ backgroundColor: t.primary, borderRadius: t.radius }}>{busy ? <Loader2 size={13} className="animate-spin" /> : cfg.buttonLabel || 'Ask'}</button></div><div className="mt-1 flex justify-end"><button onClick={() => clear(key)} className="text-[10px] opacity-60">Clear</button></div></div>
    </div>
  )
}
