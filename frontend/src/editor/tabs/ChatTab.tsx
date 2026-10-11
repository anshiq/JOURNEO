import { setAssistant, updateScreen } from '@journey/ops/index'
import { isProblem } from '@shared/api/problem'
import { LIMITS } from '@shared/limits.gen'
import { cn } from '@shared/ui/cn'
import { FileText, Globe, Loader2, MessageSquareText, RotateCw, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { SelectControl, TextControl } from '../inspector/controls'
import {
  useAddSource,
  usePlayground,
  useRemoveSource,
  useRetrySource,
  useSources,
  useUploadPdf,
} from '../queries/assistant'
import type { ChatAnswer } from '../queries/types'
import { useEditor } from '../store'
import { act } from '../store/commands'
import { Button } from '../ui/Button'
import { Empty } from '../ui/Empty'
import { Section } from '../ui/Field'
import { Switch } from '../ui/Switch'

function assistant(path: (string | number)[], value: unknown, label = 'Change visitor chat') {
  act(label, setAssistant(path, value), `assistant:${path.join('.')}`)
}

const STATUS: Record<string, string> = { pending: 'Reading…', ready: 'Ready', failed: 'Failed' }

export function ChatTab({ campaignId }: { campaignId: string }) {
  const doc = useEditor(state => state.doc)
  if (!doc) return null
  const config = doc.assistant
  const screens = Object.values(doc.screens ?? {})
  return (
    <div className="flex h-full min-h-0 w-full">
      <div className="w-[26rem] shrink-0 overflow-y-auto border-r border-slate-200 bg-white">
        <Section title="Visitor chat">
          <Switch
            label="Let visitors ask questions"
            hint="Answers come only from the sources you add"
            checked={Boolean(config)}
            onChange={on =>
              act(
                on ? 'Turn on visitor chat' : 'Turn off visitor chat',
                setAssistant(
                  null,
                  on
                    ? {
                        greeting: 'Hi! Ask me anything about this offer.',
                        placeholder: 'Type your question',
                        suggested: [],
                        fallback: 'Sorry, I don’t know that yet.',
                        placement: 'floating',
                      }
                    : null,
                ),
              )
            }
          />
        </Section>
        {config ? (
          <>
            <Section title="Messages">
              <TextControl
                label="Greeting"
                max={LIMITS.chat_greeting}
                value={config.greeting}
                onChange={v => assistant(['greeting'], v)}
              />
              <TextControl
                label="Input hint"
                max={LIMITS.chat_placeholder}
                value={config.placeholder}
                onChange={v => assistant(['placeholder'], v)}
              />
              <TextControl
                label="When there is no answer"
                field="fallback"
                max={LIMITS.fallback_text}
                multiline
                rows={2}
                value={config.fallback}
                onChange={v => assistant(['fallback'], v)}
              />
              <SelectControl
                label="Then offer a button to"
                field="fallbackTarget"
                value={config.fallbackTarget ?? ''}
                options={[
                  { value: '', label: 'No button' },
                  ...screens.map(screen => ({ value: screen.id, label: screen.name })),
                ]}
                onChange={v => assistant(['fallbackTarget'], v || null)}
              />
              {config.fallbackTarget ? (
                <TextControl
                  label="Button label"
                  max={LIMITS.button_label}
                  value={config.fallbackCtaLabel}
                  onChange={v => assistant(['fallbackCtaLabel'], v || null)}
                />
              ) : null}
            </Section>
            <Section title="Suggested questions">
              {(config.suggested ?? []).map((question, index) => (
                <div key={`${index.toString()}`} className="flex gap-1">
                  <input
                    aria-label={`Suggested question ${index + 1}`}
                    maxLength={LIMITS.suggested_question}
                    value={question}
                    onChange={event => {
                      const next = [...(config.suggested ?? [])]
                      next[index] = event.target.value
                      assistant(['suggested'], next)
                    }}
                    className="h-8 flex-1 rounded border border-slate-300 px-2 text-sm"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Remove question"
                    onClick={() =>
                      assistant(
                        ['suggested'],
                        (config.suggested ?? []).filter((_, i) => i !== index),
                        'Remove question',
                      )
                    }
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="ghost"
                disabled={(config.suggested ?? []).length >= LIMITS.max_suggested}
                onClick={() => assistant(['suggested'], [...(config.suggested ?? []), ''], 'Add question')}
              >
                Add a suggested question
              </Button>
            </Section>
            <Section title="Placement">
              <SelectControl
                label="Show the chat as"
                value={config.placement ?? 'floating'}
                options={[
                  { value: 'floating', label: 'A floating button' },
                  { value: 'pinned', label: 'A bar under the content' },
                ]}
                onChange={v => assistant(['placement'], v)}
              />
              <p className="text-xs font-medium text-slate-700">Show on these screens</p>
              {screens.map(screen => (
                <Switch
                  key={screen.id}
                  label={screen.name}
                  checked={screen.showAssistant ?? false}
                  onChange={v => act('Show chat on screen', updateScreen(screen.id, ['showAssistant'], v))}
                />
              ))}
            </Section>
          </>
        ) : null}
      </div>
      <div className="min-w-0 flex-1 overflow-y-auto bg-slate-50">
        <div className="mx-auto max-w-2xl space-y-5 px-6 py-8">
          <Sources campaignId={campaignId} />
          <Playground campaignId={campaignId} />
        </div>
      </div>
    </div>
  )
}

function Sources({ campaignId }: { campaignId: string }) {
  const sources = useSources(campaignId)
  const add = useAddSource(campaignId)
  const upload = useUploadPdf(campaignId)
  const remove = useRemoveSource(campaignId)
  const retry = useRetrySource(campaignId)
  const [mode, setMode] = useState<'url' | 'qa' | null>(null)
  const [url, setUrl] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const file = useRef<HTMLInputElement | null>(null)
  const failed = (error: unknown) => toast.error(isProblem(error) ? error.problem.detail : 'Could not add the source')
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold">What chat can answer from</h2>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setMode('url')}>
          <Globe size={13} /> Website page
        </Button>
        <Button size="sm" onClick={() => file.current?.click()} disabled={upload.isPending}>
          <FileText size={13} /> PDF
        </Button>
        <Button size="sm" onClick={() => setMode('qa')}>
          <MessageSquareText size={13} /> Question & answer
        </Button>
        <input
          ref={file}
          type="file"
          accept="application/pdf"
          className="hidden"
          aria-label="Upload a PDF"
          onChange={event => {
            const picked = event.target.files?.[0]
            if (picked) upload.mutate(picked, { onError: failed })
            event.target.value = ''
          }}
        />
      </div>
      {mode === 'url' ? (
        <form
          className="flex gap-2"
          onSubmit={event => {
            event.preventDefault()
            add.mutate(
              { kind: 'url', url },
              {
                onSuccess: () => {
                  setUrl('')
                  setMode(null)
                },
                onError: failed,
              },
            )
          }}
        >
          <input
            type="url"
            required
            maxLength={LIMITS.url}
            value={url}
            placeholder="https://yourwebsite.com/faq"
            aria-label="Page address"
            onChange={event => setUrl(event.target.value)}
            className="h-9 flex-1 rounded-md border border-slate-300 px-2 text-sm"
          />
          <Button type="submit" variant="primary" size="sm" disabled={add.isPending}>
            Add
          </Button>
        </form>
      ) : null}
      {mode === 'qa' ? (
        <form
          className="space-y-2"
          onSubmit={event => {
            event.preventDefault()
            add.mutate(
              { kind: 'qa', question, answer },
              {
                onSuccess: () => {
                  setQuestion('')
                  setAnswer('')
                  setMode(null)
                },
                onError: failed,
              },
            )
          }}
        >
          <input
            required
            maxLength={LIMITS.suggested_question * 2}
            value={question}
            placeholder="Question"
            aria-label="Question"
            onChange={event => setQuestion(event.target.value)}
            className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
          />
          <textarea
            required
            maxLength={LIMITS.long_answer}
            value={answer}
            placeholder="Answer"
            aria-label="Answer"
            rows={3}
            onChange={event => setAnswer(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
          <Button type="submit" variant="primary" size="sm" disabled={add.isPending}>
            Add
          </Button>
        </form>
      ) : null}
      {sources.data?.length === 0 ? (
        <Empty title="Add your website so chat can answer">Add a page, a PDF or a few questions and answers.</Empty>
      ) : null}
      <ul className="space-y-1">
        {(sources.data ?? []).map(source => (
          <li key={source.id} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{source.title || source.url || 'Question & answer'}</span>
            <span
              className={cn(
                'flex items-center gap-1 rounded px-1.5 text-xs',
                source.status === 'ready'
                  ? 'bg-emerald-50 text-emerald-800'
                  : source.status === 'failed'
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-slate-100 text-slate-600',
              )}
              title={source.error ?? undefined}
            >
              {source.status === 'pending' ? <Loader2 size={11} className="animate-spin" /> : null}
              {STATUS[source.status]}
            </span>
            {source.status === 'failed' ? (
              <Button size="icon" variant="ghost" aria-label="Try again" onClick={() => retry.mutate(source.id)}>
                <RotateCw size={14} />
              </Button>
            ) : null}
            <Button size="icon" variant="ghost" aria-label="Remove source" onClick={() => remove.mutate(source.id)}>
              <Trash2 size={14} />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Playground({ campaignId }: { campaignId: string }) {
  const ask = usePlayground(campaignId)
  const [question, setQuestion] = useState('')
  const [history, setHistory] = useState<{ question: string; answer: ChatAnswer }[]>([])
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold">Try it</h2>
      <ul className="space-y-3">
        {history.map((entry, index) => (
          <li key={`${index.toString()}`} className="space-y-1">
            <p className="ml-auto w-fit max-w-[80%] rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white">
              {entry.question}
            </p>
            <div className="w-fit max-w-[85%] rounded-lg bg-slate-100 px-3 py-2 text-sm">
              <p>{entry.answer.answer || 'No answer found.'}</p>
              {entry.answer.fallback ? (
                <p className="mt-1 text-xs text-amber-700">Visitors would see your fallback message.</p>
              ) : null}
              {entry.answer.citations.length ? (
                <ul className="mt-2 space-y-0.5 border-t border-slate-200 pt-1 text-xs text-slate-600">
                  {entry.answer.citations.map(citation => (
                    <li key={`${citation.title}-${citation.url ?? ''}`}>
                      Source:{' '}
                      {citation.url ? (
                        <a className="underline" href={citation.url} target="_blank" rel="noreferrer">
                          {citation.title}
                        </a>
                      ) : (
                        citation.title
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={event => {
          event.preventDefault()
          const q = question.trim()
          if (!q) return
          ask.mutate(q, {
            onSuccess: answer => {
              setHistory(current => [...current, { question: q, answer }])
              setQuestion('')
            },
            onError: () => toast.error('Chat could not answer. Try again.'),
          })
        }}
      >
        <input
          maxLength={LIMITS.playground_question}
          value={question}
          placeholder="Ask what a visitor might ask"
          aria-label="Test question"
          onChange={event => setQuestion(event.target.value)}
          className="h-9 flex-1 rounded-md border border-slate-300 px-2 text-sm"
        />
        <Button type="submit" variant="primary" size="sm" disabled={ask.isPending}>
          {ask.isPending ? <Loader2 size={13} className="animate-spin" /> : null} Ask
        </Button>
      </form>
    </section>
  )
}
