import { isProblem } from '@shared/api/problem'
import { LIMITS } from '@shared/limits.gen'
import { cn } from '@shared/ui/cn'
import { TextArea } from '@shared/ui/primitives/TextArea'
import { TextInput } from '@shared/ui/primitives/TextInput'
import { Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { uploadFile } from '../inspector/widgets/ImageField'
import { type CreateCampaignBody, useCreateCampaign } from '../queries/campaigns'
import type { Goal } from '../queries/types'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Field } from '../ui/Field'
import { Segmented } from '../ui/Segmented'
import { BRIEF_EXAMPLES, GOALS } from './goals'
import { TemplateGallery } from './TemplateGallery'

type Mode = 'ai' | 'template' | 'blank'

export function NewCampaignDialog({
  open,
  onOpenChange,
  initialGoal,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialGoal?: Goal | null
}) {
  const navigate = useNavigate()
  const create = useCreateCampaign()
  const [brief, setBrief] = useState('')
  const [goal, setGoal] = useState<Goal | null>(initialGoal ?? null)
  const [website, setWebsite] = useState('')
  const [audience, setAudience] = useState('')
  const [tone, setTone] = useState('')
  const [color, setColor] = useState('#4f46e5')
  const [useColor, setUseColor] = useState(false)
  const [logo, setLogo] = useState<{ key: string; src: string } | null>(null)
  const [mode, setMode] = useState<Mode>('template')
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const submit = () => {
    const body: CreateCampaignBody = {
      start: mode === 'template' && templateId ? { mode: 'template', templateId } : { mode },
      ...(brief.trim() ? { brief: brief.trim() } : {}),
      ...(goal ? { goal } : {}),
      ...(website.trim() ? { websiteUrl: website.trim() } : {}),
      ...(audience.trim() ? { audience: audience.trim() } : {}),
      ...(tone.trim() ? { tone: tone.trim() } : {}),
      ...(useColor || logo
        ? { brand: { ...(useColor ? { color } : {}), ...(logo ? { logoFileKey: logo.key } : {}) } }
        : {}),
    }
    create.mutate(body, {
      onSuccess: result => {
        onOpenChange(false)
        const job = result.generationJobId
        navigate(`/campaigns/${result.campaign.id}${job ? `?job=${encodeURIComponent(job)}` : ''}`)
      },
      onError: error => toast.error(isProblem(error) ? error.problem.detail : 'Could not create the campaign'),
    })
  }
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New campaign"
      description="Tell us what you are promoting. You can change everything later."
      wide
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={create.isPending || (mode === 'template' && !templateId)}
            onClick={submit}
          >
            {create.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : mode === 'ai' ? (
              <Sparkles size={14} />
            ) : null}
            {mode === 'ai' ? 'Create my campaign' : mode === 'template' ? 'Use this template' : 'Start from scratch'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="What are you promoting?">
          {id => (
            <TextArea
              id={id}
              maxLength={LIMITS.brief}
              rows={3}
              value={brief}
              placeholder="e.g. A summer sale on our handmade candles"
              onChange={event => setBrief(event.target.value)}
            />
          )}
        </Field>
        <div className="-mt-3 flex flex-wrap gap-1.5">
          {BRIEF_EXAMPLES.map(example => (
            <button
              key={example}
              type="button"
              onClick={() => setBrief(example)}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 hover:bg-indigo-50"
            >
              {example}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-700">Goal</p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Goal">
            {GOALS.map(item => (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={goal === item.value}
                title={item.hint}
                onClick={() => setGoal(goal === item.value ? null : item.value)}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm',
                  goal === item.value
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300 text-slate-700 hover:border-indigo-300',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-700">Logo</p>
            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 text-sm hover:bg-slate-50">
              {uploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : logo ? (
                <img src={logo.src} alt="" className="h-6 w-6 rounded object-contain" />
              ) : null}
              {logo ? 'Change logo' : 'Upload logo'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={async event => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  setUploading(true)
                  const picked = await uploadFile(file)
                  setUploading(false)
                  if (picked)
                    setLogo({
                      key:
                        picked.src
                          .split('/')
                          .pop()
                          ?.replace(/_\d+\.webp$/, '') ?? '',
                      src: picked.src,
                    })
                }}
              />
            </label>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-700">Brand colour</p>
            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 text-sm">
              <span
                className="relative h-5 w-5 overflow-hidden rounded-full border border-slate-300"
                style={{ background: color }}
              >
                <input
                  type="color"
                  aria-label="Brand colour"
                  value={color}
                  onChange={event => {
                    setColor(event.target.value)
                    setUseColor(true)
                  }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </span>
              {useColor ? color : 'Pick a colour'}
            </label>
          </div>
          <div className="min-w-56 flex-1">
            <Field label="Website (optional)" hint="Visitor chat learns from it">
              {id => (
                <TextInput
                  id={id}
                  type="url"
                  maxLength={LIMITS.url}
                  value={website}
                  placeholder="https://"
                  onChange={event => setWebsite(event.target.value)}
                />
              )}
            </Field>
          </div>
        </div>
        <details>
          <summary className="cursor-pointer text-sm text-indigo-700">More details</summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field label="Who is it for?">
              {id => (
                <TextInput
                  id={id}
                  maxLength={LIMITS.audience}
                  value={audience}
                  placeholder="Busy parents in Austin"
                  onChange={event => setAudience(event.target.value)}
                />
              )}
            </Field>
            <Field label="Tone">
              {id => (
                <TextInput
                  id={id}
                  maxLength={80}
                  value={tone}
                  placeholder="Friendly, upbeat"
                  onChange={event => setTone(event.target.value)}
                />
              )}
            </Field>
          </div>
        </details>
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <div className="w-96 max-w-full">
            <Segmented
              label="How to start"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'template', label: 'Template' },
                { value: 'ai', label: 'Generate with AI' },
                { value: 'blank', label: 'Blank' },
              ]}
            />
          </div>
          {mode === 'template' ? (
            <TemplateGallery
              value={templateId}
              onChange={setTemplateId}
              goal={goal}
              color={useColor ? color : undefined}
            />
          ) : null}
          {mode === 'ai' ? (
            <p className="text-sm text-slate-600">
              We draft the screens, questions and copy from your brief and goal. You review everything before it goes
              live.
            </p>
          ) : null}
          {mode === 'blank' ? (
            <p className="text-sm text-slate-600">Starts with a welcome screen and a thank-you screen.</p>
          ) : null}
        </div>
      </div>
    </Dialog>
  )
}
