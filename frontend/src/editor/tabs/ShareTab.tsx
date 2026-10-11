import { screenName } from '@journey/summary'
import { isProblem } from '@shared/api/problem'
import { LIMITS } from '@shared/limits.gen'
import { useQueryClient } from '@tanstack/react-query'
import { Copy, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DateTimeControl, SegmentedControl, TextControl } from '../inspector/controls'
import { copy, LinkCard, useQr } from '../publish/share-link'
import { keys, resetPreviewLink, slugAvailable, useUpdateCampaign } from '../queries/campaigns'
import { useSetOps } from '../queries/journey'
import type { CampaignSummary, Workspace } from '../queries/types'
import { useEditor } from '../store'
import { Button } from '../ui/Button'
import { Empty } from '../ui/Empty'
import { Switch } from '../ui/Switch'

const CHANNELS = [
  { id: 'instagram', label: 'Instagram bio', source: 'instagram', medium: 'social' },
  { id: 'whatsapp', label: 'WhatsApp', source: 'whatsapp', medium: 'messaging' },
  { id: 'email', label: 'Email', source: 'newsletter', medium: 'email' },
  { id: 'ads', label: 'Ads', source: 'ads', medium: 'paid' },
] as const

function tracked(url: string, source: string, medium: string, campaign: string): string {
  const next = new URL(url)
  next.searchParams.set('utm_source', source)
  next.searchParams.set('utm_medium', medium)
  next.searchParams.set('utm_campaign', campaign)
  return next.toString()
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  )
}

export function ShareTab({ campaign, workspace }: { campaign: CampaignSummary; workspace: Workspace }) {
  const doc = useEditor(state => state.doc)
  const client = useQueryClient()
  const update = useUpdateCampaign(campaign.id)
  const ops = useSetOps(campaign.id)
  const [slug, setSlug] = useState(campaign.slug)
  const [check, setCheck] = useState<{ available: boolean; valid: boolean; suggestion: string | null } | null>(null)
  const previewQr = useQr(campaign.previewUrl)
  const live = Boolean(workspace.live)
  const publicUrl = campaign.publicUrl ?? ''
  const origin = publicUrl ? publicUrl.slice(0, publicUrl.lastIndexOf('/c/') + 3) : '/c/'
  useEffect(() => {
    if (slug === campaign.slug || !slug) {
      setCheck(null)
      return
    }
    const timer = window.setTimeout(() => {
      slugAvailable(campaign.id, slug)
        .then(setCheck)
        .catch(() => setCheck(null))
    }, 350)
    return () => window.clearTimeout(timer)
  }, [slug, campaign.id, campaign.slug])
  if (!doc) return null
  const first = Object.values(doc.screens ?? {})[0]
  const seo = doc.settings?.seo
  const previewTitle = seo?.title || (first ? screenName(first) : campaign.name)
  const previewDescription = seo?.description || campaign.brief || ''
  const previewImage =
    seo?.image ||
    first?.layout?.media?.src ||
    (first?.elements ?? []).flatMap(el => (el.type === 'image' && el.props.src ? [el.props.src] : []))[0]
  const ended = workspace.ops.ended ?? { kind: 'message' as const, message: '' }
  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50">
      <div className="mx-auto max-w-3xl space-y-5 px-6 py-8">
        <Card title="Your link">
          {live ? (
            <LinkCard url={publicUrl} slug={campaign.slug} />
          ) : (
            <Empty
              title="Publish to get your link"
              action={
                <Button variant="primary" onClick={() => useEditor.getState().setPanel('publish')}>
                  Publish
                </Button>
              }
            >
              Your link starts working as soon as the first version is live.
            </Empty>
          )}
          <div className="space-y-1">
            <label htmlFor="slug" className="text-xs font-medium text-slate-700">
              Readable link
            </label>
            <div className="flex items-center gap-2">
              <span className="truncate text-sm text-slate-500">{origin}</span>
              <input
                id="slug"
                maxLength={LIMITS.slug}
                value={slug}
                onChange={event => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                className="h-9 min-w-0 flex-1 rounded-md border border-slate-300 px-2 font-mono text-sm"
              />
              <Button
                size="sm"
                variant="primary"
                disabled={
                  slug === campaign.slug ||
                  !slug ||
                  (check !== null && (!check.available || !check.valid)) ||
                  update.isPending
                }
                onClick={() =>
                  update.mutate(
                    { slug },
                    {
                      onSuccess: () => toast.success('Link updated. The old link keeps working.'),
                      onError: error =>
                        toast.error(isProblem(error) ? error.problem.detail : 'Could not change the link'),
                    },
                  )
                }
              >
                Save
              </Button>
            </div>
            {check && !check.valid ? <p className="text-xs text-rose-700">Use letters, numbers and dashes.</p> : null}
            {check?.valid && !check.available ? (
              <p className="text-xs text-rose-700">
                Taken.{' '}
                {check.suggestion ? (
                  <button type="button" className="underline" onClick={() => setSlug(check.suggestion ?? '')}>
                    Use {check.suggestion}
                  </button>
                ) : null}
              </p>
            ) : null}
            {check?.valid && check.available ? <p className="text-xs text-emerald-700">Available</p> : null}
          </div>
        </Card>
        {live ? (
          <Card title="Link for…">
            <p className="text-sm text-slate-600">Each link tells you in Results where visitors came from.</p>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map(channel => (
                <Button
                  key={channel.id}
                  size="sm"
                  onClick={() =>
                    copy(
                      tracked(publicUrl, channel.source, channel.medium, campaign.slug),
                      `${channel.label} link copied`,
                    )
                  }
                >
                  <Copy size={13} /> {channel.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-1 text-sm">
              <a
                className="text-indigo-700 hover:underline"
                target="_blank"
                rel="noreferrer"
                href={`https://wa.me/?text=${encodeURIComponent(`${previewTitle} ${publicUrl}`)}`}
              >
                Share on WhatsApp
              </a>
              <a
                className="text-indigo-700 hover:underline"
                href={`mailto:?subject=${encodeURIComponent(previewTitle)}&body=${encodeURIComponent(publicUrl)}`}
              >
                Share by email
              </a>
              <a
                className="text-indigo-700 hover:underline"
                target="_blank"
                rel="noreferrer"
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`}
              >
                Facebook
              </a>
              <a
                className="text-indigo-700 hover:underline"
                target="_blank"
                rel="noreferrer"
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`}
              >
                LinkedIn
              </a>
            </div>
          </Card>
        ) : null}
        <Card title="Link preview">
          <div className="max-w-md overflow-hidden rounded-lg border border-slate-200">
            {previewImage ? (
              <img src={previewImage} alt="" className="aspect-[1.91/1] w-full object-cover" />
            ) : (
              <div className="aspect-[1.91/1] bg-slate-100" />
            )}
            <div className="space-y-0.5 p-3">
              <p className="text-xs text-slate-500 uppercase">{origin.replace(/^https?:\/\//, '').split('/')[0]}</p>
              <p className="font-medium text-slate-900">{previewTitle}</p>
              <p className="line-clamp-2 text-sm text-slate-600">{previewDescription}</p>
            </div>
          </div>
          <Button size="sm" variant="link" onClick={() => useEditor.getState().setPanel('settings')}>
            Change how the link looks
          </Button>
        </Card>
        <Card title="Private preview link">
          <p className="text-sm text-slate-600">
            Shows your latest draft, even before publishing. Scan it to check on your phone.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {previewQr ? (
              <img src={previewQr} alt="QR code for the private preview link" width={104} height={104} />
            ) : null}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => campaign.previewUrl && copy(campaign.previewUrl)}>
                  <Copy size={13} /> Copy
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    const result = await resetPreviewLink(campaign.id)
                    client.setQueryData<CampaignSummary>(keys.campaign(campaign.id), current =>
                      current ? { ...current, previewUrl: result.previewUrl } : current,
                    )
                    toast.success('New private link created. The old one stopped working.')
                  }}
                >
                  <RefreshCw size={13} /> Reset link
                </Button>
              </div>
            </div>
          </div>
        </Card>
        <Card title="Availability">
          <Switch
            label="Pause campaign"
            hint="Visitors see the ended page until you resume"
            checked={workspace.ops.paused}
            onChange={paused =>
              ops.mutate({ paused }, { onSuccess: () => toast.success(paused ? 'Paused' : 'Resumed') })
            }
          />
          <DateTimeControl
            label="End automatically on"
            value={workspace.ops.endsAt}
            onChange={iso => ops.mutate(iso ? { endsAt: iso } : { clearEndsAt: true })}
          />
          <SegmentedControl
            label="After it ends, visitors see"
            value={ended.kind}
            options={[
              { value: 'message', label: 'A message' },
              { value: 'redirect', label: 'Another website' },
            ]}
            onChange={kind => ops.mutate({ ended: { ...ended, kind } })}
          />
          {ended.kind === 'message' ? (
            <EndedField
              label="Message"
              initial={ended.message ?? ''}
              max={LIMITS.text}
              onSave={message => ops.mutate({ ended: { kind: 'message', message } })}
            />
          ) : (
            <EndedField
              label="Website address"
              initial={ended.url ?? ''}
              max={LIMITS.url}
              onSave={url =>
                ops.mutate(
                  { ended: { kind: 'redirect', url } },
                  { onError: error => toast.error(isProblem(error) ? error.problem.detail : 'Could not save') },
                )
              }
            />
          )}
        </Card>
      </div>
    </div>
  )
}

function EndedField({
  label,
  initial,
  max,
  onSave,
}: {
  label: string
  initial: string
  max: number
  onSave: (value: string) => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <TextControl label={label} max={max} value={value} onChange={setValue} />
      </div>
      <Button size="sm" disabled={value === initial} onClick={() => onSave(value)}>
        Save
      </Button>
    </div>
  )
}
