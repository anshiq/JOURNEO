import { strings } from '@shared/strings'
import { cn } from '@shared/ui/cn'
import type { CampaignStatus } from './queries/types'

const tone: Record<CampaignStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  live: 'bg-emerald-100 text-emerald-800',
  live_changes: 'bg-amber-100 text-amber-800',
  paused: 'bg-slate-200 text-slate-700',
  ended: 'bg-rose-100 text-rose-800',
}

export function StatusPill({ status }: { status: CampaignStatus }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', tone[status])}>
      {strings.status[status]}
    </span>
  )
}
