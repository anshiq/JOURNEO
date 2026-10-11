import type { Screen } from '@journey/model/types'
import { type Op, updateElement, updateItem } from '@journey/ops/index'
import { LIMITS } from '@shared/limits.gen'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { TextControl } from '../inspector/controls'
import { aiFailureMessage, useRewriteScreen } from '../queries/ai'
import { useEditor } from '../store'
import { act, chain } from '../store/commands'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

interface TextSlot {
  id: string
  label: string
  before: string
  limit: number
  apply: (text: string) => Op
}

function textSlots(screen: Screen): TextSlot[] {
  return (screen.elements ?? [])
    .flatMap((element): TextSlot[] => {
      if (element.type === 'heading')
        return [
          {
            id: element.id,
            label: 'Heading',
            before: element.props.text,
            limit: LIMITS.heading,
            apply: text => updateElement(element.id, ['props', 'text'], text),
          },
        ]
      if (element.type === 'text')
        return [
          {
            id: element.id,
            label: 'Text',
            before: element.props.text,
            limit: LIMITS.text,
            apply: text => updateElement(element.id, ['props', 'text'], text),
          },
        ]
      if (element.type === 'choice' || element.type === 'rating')
        return [
          {
            id: element.id,
            label: 'Question',
            before: element.props.question,
            limit: LIMITS.question,
            apply: text => updateElement(element.id, ['props', 'question'], text),
          },
        ]
      if (element.type === 'buttons')
        return element.props.items.map(item => ({
          id: `${element.id}:${item.id}`,
          label: 'Button',
          before: item.label,
          limit: LIMITS.button_label,
          apply: text => updateItem(element.id, item.id, ['label'], text),
        }))
      return []
    })
    .filter(slot => slot.before.trim().length > 0)
}

export function RewriteScreenDialog({
  screenId,
  onOpenChange,
}: {
  screenId: string
  onOpenChange: (open: boolean) => void
}) {
  const screen = useEditor(state => state.doc?.screens?.[screenId])
  const voice = useEditor(state => state.doc?.theme?.voice)
  const rewrite = useRewriteScreen()
  const [instruction, setInstruction] = useState('')
  const [result, setResult] = useState<Record<string, string> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const slots = screen ? textSlots(screen) : []
  const changes = slots.flatMap(slot => {
    const next = result?.[slot.id]?.trim()
    return next && next !== slot.before && next.length <= slot.limit ? [{ slot, next }] : []
  })
  const run = () => {
    setError(null)
    rewrite.mutate(
      {
        texts: slots.map(slot => ({ id: slot.id, text: slot.before, limit: slot.limit })),
        instruction: instruction.trim(),
        ...(voice ? { voice } : {}),
      },
      {
        onSuccess: texts => setResult(texts),
        onError: failure => {
          setResult(null)
          setError(aiFailureMessage(failure, 'Could not rewrite this screen. Try again.'))
        },
      },
    )
  }
  const apply = () => {
    act('Rewrite screen', chain(...changes.map(({ slot, next }) => slot.apply(next))))
    onOpenChange(false)
  }
  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title="Rewrite this screen"
      description="AI rewrites the text on this screen. Review the changes before you apply them."
      wide
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Discard</Button>
          <Button disabled={slots.length === 0 || rewrite.isPending} onClick={run}>
            {rewrite.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            {result ? 'Try again' : 'Rewrite'}
          </Button>
          <Button variant="primary" disabled={changes.length === 0} onClick={apply}>
            Apply
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextControl
          label="What should change? (optional)"
          field="instruction"
          max={LIMITS.ai_prompt}
          value={instruction}
          placeholder="e.g. Shorter and more friendly"
          onChange={setInstruction}
        />
        {slots.length === 0 ? <p className="text-sm text-slate-600">This screen has no text to rewrite.</p> : null}
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        {result && changes.length === 0 ? (
          <p className="text-sm text-slate-600">The AI kept the text as it is. Try another instruction.</p>
        ) : null}
        {changes.length > 0 ? (
          <ul className="space-y-3" aria-label="Proposed changes">
            {changes.map(({ slot, next }) => (
              <li key={slot.id} className="space-y-1 rounded-md border border-slate-200 p-3 text-sm">
                <p className="text-xs font-medium text-slate-500">{slot.label}</p>
                <p className="text-slate-500 line-through">{slot.before}</p>
                <p className="whitespace-pre-line text-slate-900">{next}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Dialog>
  )
}
