import * as React from 'react'
import { Loader2, MessageCircle, X, CornerUpRight } from 'lucide-react'
import type { LiveSessionClient, QueryResult } from '../../lib/liveSession'

export default function AskAiOverlay({ client, config, sessionStatus }: { client: LiveSessionClient; config: any; sessionStatus: string }) {
  const cfg = config || {}
  const [open, setOpen] = React.useState(false)
  const [input, setInput] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<QueryResult | null>(null)
  const ready = sessionStatus === 'node' || sessionStatus === 'ended'
  const submit = async () => {
    const q = input.trim()
    if (!q || busy) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const res = await client.sendQuery(q)
      setResult(res)
    } catch (e: any) {
      setError(e?.message || 'Query failed')
    } finally {
      setBusy(false)
    }
  }
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-4 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg"
        style={{ backgroundColor: '#0891b2' }}
        title="Ask AI"
      >
        <MessageCircle size={20} />
      </button>
    )
  }
  return (
    <div className="absolute bottom-4 right-4 z-20 w-80 overflow-hidden rounded-xl border bg-white shadow-xl">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <MessageCircle size={14} className="text-cyan-600" />
        <span className="text-xs font-semibold text-slate-600">Ask AI</span>
        <button onClick={() => setOpen(false)} className="ml-auto text-slate-400 hover:text-slate-600"><X size={14} /></button>
      </div>
      <div className="space-y-2 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder={cfg.placeholder || 'Ask anything...'}
            disabled={!ready || busy}
            className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
          />
          <button onClick={submit} disabled={!ready || busy || !input.trim()} className="rounded-lg px-3 text-sm text-white disabled:opacity-50" style={{ backgroundColor: '#0891b2' }}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : (cfg.buttonLabel || 'Ask')}
          </button>
        </div>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
        {result && result.decision === 'jump' && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <div className="text-[13px] font-medium leading-snug text-emerald-950">{result.answer && result.answer !== result.targetNodeId ? result.answer : (result.targetNodeDetails?.title || 'Found it in your journey')}</div>
            {result.answer && result.answer !== result.targetNodeId && result.targetNodeDetails?.title && <div className="mt-1 font-semibold">{result.targetNodeDetails.title}</div>}
            {result.targetNodeDetails?.subtitle && <div className="mt-1 text-[11px] leading-snug text-emerald-900">{result.targetNodeDetails.subtitle}</div>}
            {(result.targetNodeDetails?.facts || []).length > 0 && (
              <div className="mt-2 space-y-1">
                {(result.targetNodeDetails?.facts || []).map((f, i) => (
                  <div key={i} className="flex gap-1.5 rounded bg-white px-2 py-1 text-[10px]"><span className="font-semibold capitalize text-slate-500">{f.label}:</span><span className="text-slate-700">{f.value}</span></div>
                ))}
              </div>
            )}
            {!result.targetNodeDetails?.title && result.targetNodeSummary && <div className="mt-1 whitespace-pre-wrap text-[11px] text-emerald-900">{result.targetNodeSummary}</div>}
            <div className="mt-1 font-mono text-[10px] opacity-70">{result.targetNodeType?.replace(/_/g, ' ')}</div>
          </div>
        )}
        {result && result.decision === 'rag' && (
          <div className="rounded-lg border border-cyan-200 bg-cyan-50/60 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-cyan-700">From knowledge base</div>
            <div className="mt-1 whitespace-pre-wrap text-xs text-slate-800">{result.answer}</div>
            {(result.citations || []).length > 0 && (
              <div className="mt-2 space-y-1">
                {(result.citations || []).slice(0, 3).map((c, i) => (
                  <div key={i} className="rounded bg-white px-2 py-1 text-[10px] text-slate-500">[{i + 1}] {c.snippet}</div>
                ))}
              </div>
            )}
          </div>
        )}
        {result && result.decision === 'reject' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{result.answer || cfg.refusalMessage || 'This question is out of context.'}</div>
        )}
      </div>
    </div>
  )
}
