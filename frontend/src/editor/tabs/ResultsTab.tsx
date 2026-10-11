import { screenOutputs } from '@journey/ports'
import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { downloadLeadsCsv, useLeads, useResults } from '../queries/results'
import type { CampaignSummary, Lead } from '../queries/types'
import { useEditor } from '../store'
import { Button } from '../ui/Button'
import { Empty } from '../ui/Empty'
import { Segmented } from '../ui/Segmented'

function percent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`
}

function display(value: unknown, labels: Record<string, string>): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.map(item => labels[String(item)] ?? String(item)).join(', ')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return labels[String(value)] ?? String(value)
}

export function ResultsTab({ campaign }: { campaign: CampaignSummary }) {
  const [range, setRange] = useState<'7d' | '30d' | 'all'>('30d')
  const results = useResults(campaign.id, range)
  const leads = useLeads(campaign.id)
  const doc = useEditor(state => state.doc)
  const columns = useMemo(() => {
    const seen = new Map<string, string>()
    for (const screen of Object.values(doc?.screens ?? {}))
      for (const output of screenOutputs(screen)) if (!seen.has(output.key)) seen.set(output.key, output.label)
    return [...seen.entries()]
  }, [doc])
  const optionLabels = useMemo(() => {
    const labels: Record<string, string> = {}
    for (const screen of Object.values(doc?.screens ?? {}))
      for (const output of screenOutputs(screen))
        for (const option of output.options ?? []) labels[option.id] = option.label
    return labels
  }, [doc])
  const data = results.data
  const rows: Lead[] = leads.data?.pages.flatMap(page => page.items) ?? []
  const maxVisitors = Math.max(1, ...(data?.funnel ?? []).map(step => step.visitors))
  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50">
      <div className="mx-auto max-w-5xl space-y-5 px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-lg font-semibold">Results</h1>
          <div className="w-72">
            <Segmented
              label="Time range"
              value={range}
              onChange={setRange}
              options={[
                { value: '7d', label: 'Last 7 days' },
                { value: '30d', label: 'Last 30 days' },
                { value: 'all', label: 'All time' },
              ]}
            />
          </div>
        </div>
        {results.isPending ? <p className="text-sm text-slate-500">Loading…</p> : null}
        {data && data.sessions === 0 ? (
          <Empty
            title="No visitors yet — share your link"
            action={<Button onClick={() => useEditor.getState().setTab('share')}>Go to Share</Button>}
          >
            Visits, answers and leads show up here as soon as people open your campaign.
          </Empty>
        ) : null}
        {data && data.sessions > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: 'Visitors', value: data.sessions.toLocaleString() },
                { label: 'Finished', value: data.completed.toLocaleString() },
                { label: 'Completion', value: percent(data.completion) },
                { label: 'Left early', value: data.abandoned.toLocaleString() },
              ].map(stat => (
                <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">{stat.label}</p>
                  <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
                </div>
              ))}
            </div>
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="pb-3 text-sm font-semibold">Where visitors drop off</h2>
              <ol className="space-y-2">
                {data.funnel.map((step, index) => (
                  <li
                    key={step.stepId}
                    className="grid grid-cols-[minmax(0,12rem)_1fr_5rem] items-center gap-3 text-sm"
                  >
                    <span className="truncate">
                      {index + 1}. {step.label}
                    </span>
                    <span className="h-5 rounded bg-slate-100">
                      <span
                        className="block h-5 rounded bg-indigo-500"
                        style={{ width: `${(step.visitors / maxVisitors) * 100}%` }}
                      />
                    </span>
                    <span className="text-right text-slate-600">{step.visitors.toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            </section>
            <div className="grid gap-5 md:grid-cols-2">
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="pb-3 text-sm font-semibold">Devices</h2>
                <ul className="space-y-1 text-sm">
                  {Object.entries(data.devices).map(([device, count]) => (
                    <li key={device} className="flex justify-between">
                      <span className="capitalize">{device}</span>
                      <span className="text-slate-600">{percent(count / Math.max(1, data.sessions))}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-semibold">Answers</h2>
                {Object.entries(data.answers).length === 0 ? (
                  <p className="text-sm text-slate-500">No answers yet.</p>
                ) : null}
                {Object.entries(data.answers).map(([key, answer]) => {
                  const total = Math.max(1, ...Object.values(answer.values))
                  return (
                    <div key={key}>
                      <p className="pb-1 text-xs font-medium text-slate-700">{answer.label}</p>
                      <ul className="space-y-1">
                        {Object.entries(answer.values)
                          .sort((a, b) => b[1] - a[1])
                          .map(([label, count]) => (
                            <li
                              key={label}
                              className="grid grid-cols-[minmax(0,8rem)_1fr_3rem] items-center gap-2 text-xs"
                            >
                              <span className="truncate">{label}</span>
                              <span className="h-3 rounded bg-slate-100">
                                <span
                                  className="block h-3 rounded bg-emerald-500"
                                  style={{ width: `${(count / total) * 100}%` }}
                                />
                              </span>
                              <span className="text-right text-slate-600">{count}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )
                })}
              </section>
            </div>
          </>
        ) : null}
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <h2 className="text-sm font-semibold">Leads</h2>
            <Button
              size="sm"
              disabled={rows.length === 0}
              onClick={() =>
                downloadLeadsCsv(campaign.id, `${campaign.slug}-leads.csv`).catch(() => toast.error('Download failed'))
              }
            >
              <Download size={13} /> Download CSV
            </Button>
          </div>
          {leads.isPending ? <p className="p-5 text-sm text-slate-500">Loading…</p> : null}
          {!leads.isPending && rows.length === 0 ? (
            <div className="p-5">
              <Empty title="No leads yet">Add a form to a screen and publish. Every submission appears here.</Empty>
            </div>
          ) : null}
          {rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Submitted</th>
                    {columns.map(([key, label]) => (
                      <th key={key} className="px-4 py-2 font-medium whitespace-nowrap">
                        {label}
                      </th>
                    ))}
                    <th className="px-4 py-2 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(lead => (
                    <tr key={lead.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 whitespace-nowrap text-slate-600">
                        {new Date(lead.createdAt).toLocaleString()}
                      </td>
                      {columns.map(([key]) => (
                        <td key={key} className="max-w-56 truncate px-4 py-2">
                          {display(lead.answers[key], optionLabels)}
                        </td>
                      ))}
                      <td className="px-4 py-2 text-slate-600">{lead.utm.utm_source ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {leads.hasNextPage ? (
            <div className="border-t border-slate-200 p-3 text-center">
              <Button size="sm" onClick={() => void leads.fetchNextPage()} disabled={leads.isFetchingNextPage}>
                Load more
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
