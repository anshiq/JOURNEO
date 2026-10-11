import type { Assistant } from '@journey/model/types'
import { LIMITS } from '@shared/limits.gen'
import { useId, useRef, useState } from 'react'
import { cn } from '../classnames'
import * as s from '../styles/elements.css'

export interface ChatAnswer {
  answer: string
  citations?: { title: string; url?: string | null }[]
  fallback?: boolean
  cta?: { label: string; target: string } | null
}

interface Message {
  id: number
  mine: boolean
  text: string
  answer?: ChatAnswer
}

export default function VisitorChat({
  config,
  onAsk,
  onCta,
}: {
  config: Assistant
  onAsk: (question: string) => Promise<ChatAnswer>
  onCta?: (target: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<Message[]>(() => [
    { id: 0, mine: false, text: config.greeting ?? 'How can I help?' },
  ])
  const counter = useRef(1)
  const panelId = useId()

  const ask = (text: string) => {
    const trimmed = text.trim().slice(0, LIMITS.chat_question)
    if (!trimmed || busy) return
    setMessages(current => [...current, { id: counter.current++, mine: true, text: trimmed }])
    setQuestion('')
    setBusy(true)
    onAsk(trimmed)
      .then(answer =>
        setMessages(current => [...current, { id: counter.current++, mine: false, text: answer.answer, answer }]),
      )
      .catch(() =>
        setMessages(current => [
          ...current,
          {
            id: counter.current++,
            mine: false,
            text: config.fallback ?? 'Sorry, something went wrong. Please try again.',
          },
        ]),
      )
      .finally(() => setBusy(false))
  }

  if (!open) {
    return (
      <button
        type="button"
        className={s.chatButton}
        aria-expanded={false}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
      >
        Ask a question
      </button>
    )
  }
  return (
    <div id={panelId} className={s.chatPanel} role="dialog" aria-label="Questions">
      <div className={s.chatHeader}>
        <span>Questions</span>
        <button type="button" className={s.tap} aria-label="Close" onClick={() => setOpen(false)}>
          ✕
        </button>
      </div>
      <div className={s.chatLog} aria-live="polite">
        {messages.map(message => (
          <div key={message.id} className={cn(s.chatBubble, message.mine && s.chatMine)}>
            <p>{message.text}</p>
            {message.answer?.citations?.length ? (
              <p className={s.hint}>Source: {message.answer.citations.map(c => c.title).join(', ')}</p>
            ) : null}
            {message.answer?.cta && onCta ? (
              <button
                type="button"
                className={s.button.outline}
                onClick={() => message.answer?.cta && onCta(message.answer.cta.target)}
              >
                {message.answer.cta.label}
              </button>
            ) : null}
          </div>
        ))}
        {messages.length === 1 && config.suggested?.length ? (
          <div className={s.chatSuggestions}>
            {config.suggested.map(item => (
              <button key={item} type="button" className={cn(s.option, s.optionPill)} onClick={() => ask(item)}>
                {item}
              </button>
            ))}
          </div>
        ) : null}
        {busy ? <p className={cn(s.hint, s.busy)}>Thinking…</p> : null}
      </div>
      <form
        className={s.chatForm}
        onSubmit={event => {
          event.preventDefault()
          ask(question)
        }}
      >
        <input
          className={s.input}
          aria-label={config.placeholder ?? 'Ask a question'}
          placeholder={config.placeholder ?? 'Ask a question'}
          maxLength={LIMITS.chat_question}
          value={question}
          onChange={event => setQuestion(event.target.value)}
        />
        <button type="submit" className={s.button.primary} disabled={busy || !question.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}
