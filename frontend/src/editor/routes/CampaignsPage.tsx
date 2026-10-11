import { isProblem } from '@shared/api/problem'
import { strings } from '@shared/strings'
import { MoreHorizontal, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { GOALS } from '../campaign/goals'
import { NewCampaignDialog } from '../campaign/NewCampaignDialog'
import { useCampaigns, useDeleteCampaign, useDuplicateCampaign } from '../queries/campaigns'
import type { Goal } from '../queries/types'
import { StatusPill } from '../StatusPill'
import { TokenGate } from '../TokenGate'
import { Button } from '../ui/Button'
import { Confirm } from '../ui/Confirm'
import { Menu } from '../ui/Menu'

export function CampaignsPage() {
  const campaigns = useCampaigns()
  const remove = useDeleteCampaign()
  const duplicate = useDuplicateCampaign()
  const [open, setOpen] = useState(false)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null)
  if (isProblem(campaigns.error, 401)) return <TokenGate />
  const start = (value: Goal | null) => {
    setGoal(value)
    setOpen(true)
  }
  return (
    <main className="mx-auto h-full max-w-6xl overflow-y-auto px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{strings.campaigns}</h1>
        <Button variant="primary" onClick={() => start(null)}>
          <Plus size={16} /> {strings.newCampaign}
        </Button>
      </header>
      {campaigns.isPending ? <p className="text-slate-500">{strings.loading}</p> : null}
      {campaigns.isError && !isProblem(campaigns.error, 401) ? (
        <p className="text-rose-700">{strings.loadFailed}</p>
      ) : null}
      {campaigns.data?.length === 0 ? (
        <section className="space-y-4">
          <p className="text-slate-600">What do you want to do? Pick a goal to get started.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {GOALS.map(item => (
              <button
                key={item.value}
                type="button"
                onClick={() => start(item.value)}
                className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300"
              >
                <p className="font-medium">{item.label}</p>
                <p className="mt-1 text-sm text-slate-500">{item.hint}</p>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {campaigns.data?.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Campaign</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Visitors</th>
                <th className="px-4 py-2 text-right font-medium">Leads</th>
                <th className="px-4 py-2 text-right font-medium">Conversion</th>
                <th className="px-4 py-2 font-medium">Updated</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {campaigns.data.map(campaign => (
                <tr key={campaign.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/campaigns/${campaign.id}`} className="font-medium text-slate-900 hover:text-indigo-700">
                      {campaign.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={campaign.status ?? 'draft'} />
                  </td>
                  <td className="px-4 py-3 text-right">{(campaign.views ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{(campaign.leads ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    {campaign.views ? `${Math.round(((campaign.leads ?? 0) / campaign.views) * 1000) / 10}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{new Date(campaign.updatedAt).toLocaleDateString()}</td>
                  <td className="px-2 py-3">
                    <Menu
                      trigger={
                        <Button size="icon" variant="ghost" aria-label={`More for ${campaign.name}`}>
                          <MoreHorizontal size={16} />
                        </Button>
                      }
                      items={[
                        {
                          label: 'Duplicate',
                          onSelect: () =>
                            duplicate.mutate(campaign.id, { onSuccess: copy => toast.success(`Created ${copy.name}`) }),
                        },
                        {
                          label: 'Delete',
                          danger: true,
                          onSelect: () => setDeleting({ id: campaign.id, name: campaign.name }),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <NewCampaignDialog key={`${open}-${goal ?? ''}`} open={open} onOpenChange={setOpen} initialGoal={goal} />
      <Confirm
        open={deleting !== null}
        onOpenChange={value => !value && setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'campaign'}?`}
        description="Its link stops working right away. Leads already collected are kept for 30 days."
        confirmLabel="Delete"
        danger
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => toast.success('Campaign deleted') })}
      />
    </main>
  )
}
