import * as React from 'react'
import { getDevice } from '../../nodes/_core/registry'
import { getNodeStyle } from '../../nodes/_core/preview'
import type { ChatMessage } from '../../lib/askAiThread'

export default function PinnedAnswers({ theme, messages, onUnpin }: { theme: any; messages: ChatMessage[]; onUnpin?: (id: string) => void }) {
  const Device = getDevice('card')
  if (!messages.length) return null
  return (
    <div className="space-y-2">
      {messages.map(m => {
        const text = m.editedText || m.text
        const cfg = m.result?.targetNodeDetails
        return (
          <div key={m.id} className="relative border bg-card p-2 text-xs" style={{ borderColor: theme.primary + '40', borderRadius: theme.radius }}>
            {onUnpin && <button onClick={() => onUnpin(m.id)} className="absolute right-1 top-1 text-[10px] opacity-60">✕</button>}
            <div className="text-[10px] uppercase opacity-60">{cfg ? 'Jump target' : 'Pinned answer'}</div>
            {cfg?.title && <div className="font-semibold">{cfg.title}</div>}
            <div className="whitespace-pre-wrap">{text}</div>
            {m.result?.targetNodeId && typeof Device === 'function' && (
              <div className="mt-1 text-[10px] opacity-60">{m.result.targetNodeType} · {m.result.targetNodeId.slice(0, 8)}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
