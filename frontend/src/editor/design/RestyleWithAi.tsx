import type { Theme } from '@journey/model/types'
import { setTheme } from '@journey/ops/index'
import { isProblem } from '@shared/api/problem'
import { LIMITS } from '@shared/limits.gen'
import { Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { TextControl } from '../inspector/controls'
import { useRestyle } from '../queries/ai'
import { createCheckpoint } from '../queries/journey'
import { useEditor } from '../store'
import { act, chain } from '../store/commands'
import { Button } from '../ui/Button'
import { Section } from '../ui/Field'
import { Segmented } from '../ui/Segmented'

type Source = 'prompt' | 'website'

const SWATCHES = ['primary', 'accent', 'background', 'surface', 'text'] as const

function themeOps(theme: Partial<Theme>) {
  return chain(
    ...Object.entries(theme.colors ?? {}).flatMap(([key, value]) => (value ? [setTheme(['colors', key], value)] : [])),
    theme.fonts?.pairing ? setTheme(['fonts', 'pairing'], theme.fonts.pairing) : null,
    theme.radius ? setTheme(['radius'], theme.radius) : null,
    theme.buttons?.style ? setTheme(['buttons', 'style'], theme.buttons.style) : null,
  )
}

export function RestyleWithAi() {
  const campaignId = useEditor(state => state.campaignId)
  const restyle = useRestyle()
  const [source, setSource] = useState<Source>('prompt')
  const [prompt, setPrompt] = useState('')
  const [website, setWebsite] = useState('')
  const [proposal, setProposal] = useState<Partial<Theme> | null>(null)
  const [applying, setApplying] = useState(false)
  const ready = source === 'prompt' ? prompt.trim().length > 0 : website.trim().length > 0
  const run = () => {
    setProposal(null)
    restyle.mutate(source === 'prompt' ? { prompt: prompt.trim() } : { websiteUrl: website.trim() }, {
      onSuccess: result => setProposal(result.theme ?? null),
      onError: failure =>
        toast.error(
          isProblem(failure, 503)
            ? 'AI is not set up'
            : isProblem(failure)
              ? failure.problem.detail
              : 'Could not restyle. Try again.',
        ),
    })
  }
  const apply = async () => {
    if (!proposal) return
    setApplying(true)
    try {
      await createCheckpoint(campaignId, 'ai_restyle')
    } catch {
      toast.error('Could not save a version before restyling. Try again.')
      setApplying(false)
      return
    }
    setApplying(false)
    act('Restyle with AI', themeOps(proposal))
    setProposal(null)
  }
  return (
    <Section title="Restyle with AI">
      <Segmented
        label="Restyle from"
        value={source}
        onChange={setSource}
        options={[
          { value: 'prompt', label: 'Prompt' },
          { value: 'website', label: 'Website' },
        ]}
      />
      {source === 'prompt' ? (
        <TextControl
          label="Describe the look"
          field="prompt"
          max={LIMITS.ai_prompt}
          multiline
          rows={2}
          value={prompt}
          placeholder="e.g. calm, premium, lots of white space"
          onChange={setPrompt}
        />
      ) : (
        <TextControl
          label="Website address"
          field="website"
          type="url"
          max={LIMITS.url}
          value={website}
          placeholder="https://"
          onChange={setWebsite}
        />
      )}
      <Button size="sm" disabled={!ready || restyle.isPending} onClick={run}>
        {restyle.isPending ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
        {restyle.isPending ? 'Restyling…' : 'Preview new look'}
      </Button>
      {proposal ? (
        <div className="space-y-3">
          <div
            role="img"
            className="flex h-8 overflow-hidden rounded-md border border-slate-200"
            aria-label="Proposed colours"
          >
            {SWATCHES.map(key => {
              const color = proposal.colors?.[key]
              return color ? (
                <span key={key} title={`${key} ${color}`} className="flex-1" style={{ background: color }} />
              ) : null
            })}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" disabled={applying} onClick={() => void apply()}>
              {applying ? <Loader2 size={13} className="animate-spin" /> : null}
              Apply
            </Button>
            <Button size="sm" onClick={() => setProposal(null)}>
              Discard
            </Button>
          </div>
        </div>
      ) : null}
    </Section>
  )
}
