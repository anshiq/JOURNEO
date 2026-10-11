import { setSettings } from '@journey/ops/index'
import { isProblem } from '@shared/api/problem'
import { LIMITS } from '@shared/limits.gen'
import { useState } from 'react'
import { toast } from 'sonner'
import { TextControl } from '../inspector/controls'
import { ImageField } from '../inspector/widgets/ImageField'
import { useSetOps } from '../queries/journey'
import { useLeads, useTestWebhook } from '../queries/results'
import type { Workspace } from '../queries/types'
import { useEditor } from '../store'
import { act } from '../store/commands'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Section } from '../ui/Field'
import { Switch } from '../ui/Switch'
import { Tabs } from '../ui/Tabs'

function settings(path: string[], value: unknown, label = 'Change settings') {
  act(label, setSettings(path, value), `settings:${path.join('.')}`)
}

export function SettingsDialog({ campaignId, workspace }: { campaignId: string; workspace: Workspace }) {
  const open = useEditor(state => state.panel === 'settings')
  const doc = useEditor(state => state.doc)
  const [tab, setTab] = useState('journey')
  if (!doc) return null
  const s = doc.settings ?? {}
  return (
    <Dialog
      open={open}
      onOpenChange={next => useEditor.getState().setPanel(next ? 'settings' : null)}
      title="Settings"
      description="Journey behaviour, legal details, where leads go and how links look when shared"
      wide
    >
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          {
            value: 'journey',
            label: 'Journey',
            content: (
              <Section title="Navigation">
                <Switch
                  label="Show a progress bar"
                  checked={(s.progress ?? 'bar') === 'bar'}
                  onChange={v => settings(['progress'], v ? 'bar' : 'none')}
                />
                <Switch
                  label="Let visitors go back"
                  checked={s.allowBack ?? false}
                  onChange={v => settings(['allowBack'], v)}
                />
              </Section>
            ),
          },
          {
            value: 'legal',
            label: 'Legal',
            content: (
              <Section title="Legal details">
                <TextControl
                  label="Company name"
                  field="company"
                  max={LIMITS.legal_company}
                  value={s.legal?.company}
                  onChange={v => settings(['legal', 'company'], v || null)}
                />
                <TextControl
                  label="Privacy policy link"
                  field="privacyUrl"
                  type="url"
                  max={LIMITS.url}
                  value={s.legal?.privacyUrl}
                  onChange={v => settings(['legal', 'privacyUrl'], v || null)}
                />
                <TextControl
                  label="Terms link"
                  field="termsUrl"
                  type="url"
                  max={LIMITS.url}
                  value={s.legal?.termsUrl}
                  onChange={v => settings(['legal', 'termsUrl'], v || null)}
                />
                <p className="text-xs text-slate-500">Used for the default consent text on forms.</p>
              </Section>
            ),
          },
          { value: 'leads', label: 'Leads', content: <LeadsSettings campaignId={campaignId} workspace={workspace} /> },
          {
            value: 'seo',
            label: 'Search & sharing',
            content: (
              <Section title="How your link looks when shared">
                <TextControl
                  label="Title"
                  field="title"
                  max={LIMITS.seo_title}
                  value={s.seo?.title}
                  placeholder="Taken from your first screen"
                  onChange={v => settings(['seo', 'title'], v || null)}
                />
                <TextControl
                  label="Description"
                  field="description"
                  multiline
                  rows={2}
                  max={LIMITS.seo_description}
                  value={s.seo?.description}
                  onChange={v => settings(['seo', 'description'], v || null)}
                />
                <ImageField
                  label="Share image"
                  field="image"
                  compact
                  src={s.seo?.image}
                  onPick={image => settings(['seo', 'image'], image.src)}
                  onClear={() => settings(['seo', 'image'], null)}
                />
              </Section>
            ),
          },
        ]}
      />
    </Dialog>
  )
}

function LeadsSettings({ campaignId, workspace }: { campaignId: string; workspace: Workspace }) {
  const ops = useSetOps(campaignId)
  const test = useTestWebhook(campaignId)
  const leads = useLeads(campaignId)
  const [url, setUrl] = useState(workspace.ops.leadsWebhook?.url ?? '')
  const status = leads.data?.pages[0]?.webhook
  const save = () => {
    if (!url.trim()) {
      ops.mutate({ clearLeadsWebhook: true }, { onSuccess: () => toast.success('Webhook removed') })
      return
    }
    ops.mutate(
      { leadsWebhook: { url: url.trim(), enabled: true } },
      {
        onSuccess: () => toast.success('Saved'),
        onError: error => toast.error(isProblem(error) ? error.problem.detail : 'Could not save'),
      },
    )
  }
  return (
    <Section title="Where leads go">
      <p className="text-sm text-slate-700">Leads are always kept in Journeo under Results.</p>
      <TextControl
        label="Also send each lead to a webhook (optional)"
        field="leadsWebhook.url"
        type="url"
        max={LIMITS.webhook_url}
        value={url}
        placeholder="https://hooks.example.com/…"
        hint="Works with Zapier, Make, your CRM or any https address"
        onChange={setUrl}
      />
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={save} disabled={ops.isPending}>
          Save
        </Button>
        <Button
          size="sm"
          disabled={!workspace.ops.leadsWebhook || test.isPending}
          onClick={() =>
            test.mutate(undefined, {
              onSuccess: result =>
                result.delivered
                  ? toast.success('Test lead delivered')
                  : toast.error(`Delivery failed${result.statusCode ? ` (${result.statusCode})` : ''}`),
              onError: error => toast.error(isProblem(error) ? error.problem.detail : 'Could not send a test lead'),
            })
          }
        >
          Send test lead
        </Button>
      </div>
      {status ? (
        <p className={status.delivered ? 'text-xs text-emerald-700' : 'text-xs text-rose-700'}>
          Last delivery {status.delivered ? 'succeeded' : `failed${status.error ? `: ${status.error}` : ''}`} ·{' '}
          {new Date(status.at).toLocaleString()}
        </p>
      ) : null}
    </Section>
  )
}
