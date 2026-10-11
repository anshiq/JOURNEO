import { Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { aiFailureMessage, useRewrite } from '../queries/ai'
import { useEditor } from '../store'
import { Popover } from '../ui/Popover'

const INSTRUCTIONS = ['Shorter', 'More persuasive', 'Friendlier', 'Simpler'] as const

export function RewriteMenu({
  kind,
  limit,
  readText,
  onPick,
}: {
  kind: 'heading' | 'text'
  limit: number
  readText: () => string
  onPick: (text: string) => void
}) {
  const voice = useEditor(state => state.doc?.theme?.voice)
  const rewrite = useRewrite()
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const run = (instruction: string) => {
    const text = readText().trim()
    if (!text) {
      setError('Write something first.')
      return
    }
    setError(null)
    rewrite.mutate(
      { text, instruction, kind, ...(voice ? { voice } : {}) },
      {
        onSuccess: options => {
          const fitting = options.filter(option => option.length <= limit && option.trim() !== text)
          setSuggestions(fitting)
          if (fitting.length === 0) setError('No option fits this field. Try another instruction.')
        },
        onError: failure => {
          setSuggestions([])
          setError(aiFailureMessage(failure, 'Could not rewrite. Try again.'))
        },
      },
    )
  }
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      className="w-72"
      trigger={
        <button
          type="button"
          aria-label="Rewrite with AI"
          title="Rewrite with AI"
          onMouseDown={event => event.preventDefault()}
          className="flex h-7 w-7 items-center justify-center rounded text-indigo-700 hover:bg-indigo-50"
          style={{ minHeight: 0, minWidth: 0 }}
        >
          <Sparkles size={14} />
        </button>
      }
    >
      <p className="px-2 pb-1 text-xs text-slate-500">Rewrite with AI</p>
      <div className="flex flex-wrap gap-1 px-1 pb-2">
        {INSTRUCTIONS.map(instruction => (
          <button
            key={instruction}
            type="button"
            disabled={rewrite.isPending}
            onClick={() => run(instruction)}
            className="rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:border-indigo-300 disabled:opacity-50"
          >
            {instruction}
          </button>
        ))}
      </div>
      {rewrite.isPending ? (
        <p className="flex items-center gap-2 px-2 py-1 text-sm text-slate-600">
          <Loader2 size={14} className="animate-spin" /> Writing options…
        </p>
      ) : null}
      {error ? <p className="px-2 py-1 text-sm text-rose-700">{error}</p> : null}
      {suggestions.map(suggestion => (
        <button
          key={suggestion}
          type="button"
          className="block w-full rounded px-2 py-1.5 text-left text-sm whitespace-pre-line hover:bg-slate-100"
          onClick={() => {
            setOpen(false)
            onPick(suggestion)
          }}
        >
          {suggestion}
        </button>
      ))}
    </Popover>
  )
}
