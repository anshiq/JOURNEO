import * as React from 'react'
import { Loader2, MessageCircle, X } from 'lucide-react'
import type { LiveSessionClient, QueryResult } from '../../lib/liveSession'

interface OverlayTheme { primary: string; surface: string; foreground: string; radius: number; font: string }

const FALLBACK_THEME: OverlayTheme = { primary: '#000000', surface: '#FFFFFF', foreground: '#111111', radius: 0, font: 'Inter' }

export default function AskAiOverlay({ client, config, sessionStatus, theme }: { client: LiveSessionClient; config: any; sessionStatus: string; theme?: OverlayTheme }) {
  const t = theme || FALLBACK_THEME
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
        className="absolute bottom-4 right-4 z-20 flex h-12 w-12 items-center justify-center text-white"
        style={{ backgroundColor: t.primary, borderRadius: t.radius, fontFamily: t.font }}
        title="Ask AI"
      >
        <MessageCircle size={20} />
      </button>
    )
  }
  return (
    <div className="absolute bottom-4 right-4 z-20 w-80 overflow-hidden border" style={{ backgroundColor: t.surface, color: t.foreground, borderColor: t.primary, borderRadius: t.radius, fontFamily: t.font }}>
      <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: t.primary + '33' }}>
        <MessageCircle size={14} />
        <span className="text-xs font-semibold">Ask AI</span>
        <button onClick={() => setOpen(false)} className="ml-auto opacity-60 hover:opacity-100"><X size={14} /></button>
      </div>
      <div className="space-y-2 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder={cfg.placeholder || 'Ask anything...'}
            disabled={!ready || busy}
            className="h-9 flex-1 border px-3 text-sm"
            style={{ borderRadius: t.radius, borderColor: t.primary + '55', backgroundColor: t.surface, color: t.foreground, fontFamily: t.font }}
          />
          <button onClick={submit} disabled={!ready || busy || !input.trim()} className="px-3 text-sm text-white disabled:opacity-50" style={{ backgroundColor: t.primary, borderRadius: t.radius }}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : (cfg.buttonLabel || 'Ask')}
          </button>
        </div>
        {error && <div className="border px-3 py-2 text-xs" style={{ borderColor: t.primary, color: t.foreground, borderRadius: t.radius }}>{error}</div>}
        {result && result.decision === 'jump' && (
          <div className="border px-3 py-2 text-xs" style={{ borderColor: t.primary, borderRadius: t.radius }}>
            <div className="text-[13px] font-medium leading-snug">{result.answer && result.answer !== result.targetNodeId ? result.answer : (result.targetNodeDetails?.title || 'Found it in your journey')}</div>
            {result.answer && result.answer !== result.targetNodeId && result.targetNodeDetails?.title && <div className="mt-1 font-semibold">{result.targetNodeDetails.title}</div>}
            {result.targetNodeDetails?.subtitle && <div className="mt-1 text-[11px] leading-snug opacity-80">{result.targetNodeDetails.subtitle}</div>}
            {(result.targetNodeDetails?.facts || []).length > 0 && (
              <div className="mt-2 space-y-1">
                {(result.targetNodeDetails?.facts || []).map((f, i) => (
                  <div key={i} className="flex gap-1.5 px-2 py-1 text-[10px]" style={{ backgroundColor: t.primary + '0D', borderRadius: t.radius }}><span className="font-semibold capitalize opacity-60">{f.label}:</span><span>{f.value}</span></div>
                ))}
              </div>
            )}
            {!result.targetNodeDetails?.title && result.targetNodeSummary && <div className="mt-1 whitespace-pre-wrap text-[11px] opacity-80">{result.targetNodeSummary}</div>}
            <div className="mt-1 font-mono text-[10px] opacity-60">{result.targetNodeType?.replace(/_/g, ' ')}</div>
          </div>
        )}
        {result && result.decision === 'rag' && (
          <div className="border px-3 py-2" style={{ borderColor: t.primary + '55', borderRadius: t.radius }}>
            <div className="text-[10px] font-semibold uppercase tracking-wide opacity-60">From knowledge base</div>
            <div className="mt-1 whitespace-pre-wrap text-xs">{result.answer}</div>
            {(result.citations || []).length > 0 && (
              <div className="mt-2 space-y-1">
                {(result.citations || []).slice(0, 3).map((c, i) => (
                  <div key={i} className="px-2 py-1 text-[10px] opacity-60" style={{ backgroundColor: t.primary + '0D', borderRadius: t.radius }}>[{i + 1}] {c.snippet}</div>
                ))}
              </div>
            )}
          </div>
        )}
        {result && result.decision === 'reject' && (
          <div className="border px-3 py-2 text-xs" style={{ borderColor: t.primary, opacity: 0.9, borderRadius: t.radius }}>{result.answer || cfg.refusalMessage || 'This question is out of context.'}</div>
        )}
      </div>
    </div>
  )
}
