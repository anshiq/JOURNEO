import { stepName } from '@journey/summary'
import { LIMITS } from '@shared/limits.gen'
import { cn } from '@shared/ui/cn'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CloudOff,
  History,
  LayoutGrid,
  Loader2,
  Monitor,
  MoreHorizontal,
  Play,
  Redo2,
  Settings,
  Smartphone,
  Tablet,
  Undo2,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { IssuesList, useAllIssues } from '../issues/IssuesPanel'
import { useDuplicateCampaign, useSaveAsTemplate, useUpdateCampaign } from '../queries/campaigns'
import type { CampaignSummary, Workspace } from '../queries/types'
import { StatusPill } from '../StatusPill'
import { type SaveStatus, type Tab, useEditor } from '../store'
import { Button } from '../ui/Button'
import { Menu } from '../ui/Menu'
import { Popover } from '../ui/Popover'

const TABS: { value: Tab; label: string }[] = [
  { value: 'build', label: 'Build' },
  { value: 'design', label: 'Design' },
  { value: 'chat', label: 'Visitor chat' },
  { value: 'share', label: 'Share' },
  { value: 'results', label: 'Results' },
]

const SAVE_LABEL: Record<SaveStatus, string> = {
  clean: 'Saved',
  dirty: 'Unsaved changes',
  saving: 'Saving…',
  offline: 'Offline · will retry',
  conflict: 'Changed elsewhere',
  error: 'Not saved · retrying',
}

export function statusOf(workspace: Workspace, hash: string): Workspace['status'] {
  if (workspace.status === 'paused' || workspace.status === 'ended') return workspace.status
  if (!workspace.live) return 'draft'
  return workspace.live.hash === hash ? 'live' : 'live_changes'
}

export function TopBar({ campaign, workspace }: { campaign: CampaignSummary; workspace: Workspace }) {
  const tab = useEditor(state => state.tab)
  const breakpoint = useEditor(state => state.breakpoint)
  const canvas = useEditor(state => state.canvas)
  const status = useEditor(state => state.status)
  const canUndo = useEditor(state => state.past.length > 0)
  const canRedo = useEditor(state => state.future.length > 0)
  const undoLabel = useEditor(state => state.past.at(-1)?.label)
  const hash = useEditor(state => state.hash)
  const issues = useAllIssues()
  const errors = issues.filter(issue => issue.severity === 'error')
  const rename = useUpdateCampaign(campaign.id)
  const duplicate = useDuplicateCampaign()
  const saveTemplate = useSaveAsTemplate(campaign.id)
  const [name, setName] = useState(campaign.name)
  const [issuesOpen, setIssuesOpen] = useState(false)
  const editor = useEditor.getState()
  const selectedScreen = useEditor(state =>
    state.selection.kind === 'screen' || state.selection.kind === 'element' || state.selection.kind === 'item'
      ? state.selection.screenId
      : null,
  )
  const doc = useEditor(state => state.doc)
  const device = (value: 'mobile' | 'tablet' | 'desktop', label: string, Icon: typeof Smartphone) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={canvas !== 'all' && breakpoint === value}
      onClick={() => {
        editor.setBreakpoint(value)
        if (canvas === 'all') editor.setCanvas('screen')
      }}
      className={cn(
        'flex h-7 w-8 items-center justify-center rounded text-slate-600',
        canvas !== 'all' && breakpoint === value ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900',
      )}
    >
      <Icon size={15} />
    </button>
  )
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3">
      <Link
        to="/campaigns"
        aria-label="Back to campaigns"
        className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
      >
        <ArrowLeft size={18} />
      </Link>
      <input
        aria-label="Campaign name"
        maxLength={LIMITS.campaign_name}
        value={name}
        onChange={event => setName(event.target.value)}
        onBlur={() => {
          const trimmed = name.trim()
          if (!trimmed) setName(campaign.name)
          else if (trimmed !== campaign.name) rename.mutate({ name: trimmed })
        }}
        onKeyDown={event => event.key === 'Enter' && event.currentTarget.blur()}
        className="h-8 w-48 min-w-0 truncate rounded-md px-2 text-sm font-semibold outline-none hover:bg-slate-100 focus:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500"
      />
      <StatusPill status={statusOf(workspace, hash)} />
      <nav aria-label="Workspace sections" className="ml-2 flex items-center gap-0.5">
        {TABS.map(item => (
          <button
            key={item.value}
            type="button"
            aria-current={tab === item.value ? 'page' : undefined}
            onClick={() => editor.setTab(item.value)}
            className={cn(
              'rounded-md px-2.5 py-1.5 text-sm font-medium',
              tab === item.value ? 'bg-indigo-50 text-indigo-800' : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="flex-1" />
      {tab === 'build' || tab === 'design' ? (
        <div
          className="flex items-center gap-0.5 rounded-md bg-slate-100 p-0.5"
          role="group"
          aria-label="Preview device"
        >
          {device('mobile', 'Mobile', Smartphone)}
          {device('tablet', 'Tablet', Tablet)}
          {device('desktop', 'Desktop', Monitor)}
          <button
            type="button"
            title="All devices"
            aria-label="All devices"
            aria-pressed={canvas === 'all'}
            onClick={() => editor.setCanvas(canvas === 'all' ? 'screen' : 'all')}
            className={cn(
              'flex h-7 w-8 items-center justify-center rounded text-slate-600',
              canvas === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900',
            )}
          >
            <LayoutGrid size={15} />
          </button>
        </div>
      ) : null}
      <div className="flex items-center">
        <Button
          size="icon"
          variant="ghost"
          aria-label="Undo"
          title={undoLabel ? `Undo ${undoLabel}` : 'Undo'}
          disabled={!canUndo}
          onClick={() => editor.undo()}
        >
          <Undo2 size={16} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Redo"
          title="Redo"
          disabled={!canRedo}
          onClick={() => editor.redo()}
        >
          <Redo2 size={16} />
        </Button>
      </div>
      <span
        role="status"
        className={cn(
          'flex w-36 items-center gap-1 text-xs',
          status === 'clean'
            ? 'text-slate-500'
            : status === 'conflict' || status === 'error'
              ? 'text-rose-700'
              : 'text-slate-600',
        )}
      >
        {status === 'saving' ? (
          <Loader2 size={13} className="animate-spin" />
        ) : status === 'clean' ? (
          <Check size={13} />
        ) : status === 'offline' ? (
          <CloudOff size={13} />
        ) : null}
        {SAVE_LABEL[status]}
      </span>
      <Popover
        open={issuesOpen}
        onOpenChange={setIssuesOpen}
        align="end"
        className="w-96"
        trigger={
          <Button size="sm" variant="ghost" aria-label={`${issues.length} things to check`}>
            <AlertTriangle size={14} className={errors.length ? 'text-rose-600' : 'text-slate-400'} />
            {issues.length}
          </Button>
        }
      >
        <IssuesList issues={issues} compact onFix={() => setIssuesOpen(false)} />
      </Popover>
      <Menu
        trigger={
          <Button size="icon" variant="ghost" aria-label="More">
            <MoreHorizontal size={16} />
          </Button>
        }
        items={[
          { label: 'Settings', icon: <Settings size={14} />, onSelect: () => editor.setPanel('settings') },
          { label: 'Version history', icon: <History size={14} />, onSelect: () => editor.setPanel('versions') },
          'separator',
          {
            label: 'Duplicate campaign',
            onSelect: () =>
              duplicate.mutate(campaign.id, {
                onSuccess: copy =>
                  toast.success(`Created ${copy.name}`, {
                    action: { label: 'Open', onClick: () => window.location.assign(`/campaigns/${copy.id}`) },
                  }),
              }),
          },
          {
            label: 'Save as template',
            onSelect: () =>
              saveTemplate.mutate(campaign.name.slice(0, LIMITS.template_name), {
                onSuccess: () => toast.success('Saved to My templates'),
                onError: () => toast.error('Could not save the template'),
              }),
          },
        ]}
      />
      <Button
        variant="secondary"
        data-coachmark="play"
        onClick={() => editor.play(selectedScreen)}
        title={selectedScreen && doc ? `Play from ${stepName(doc, selectedScreen)}` : 'Play'}
      >
        <Play size={15} /> Play
      </Button>
      <Button variant="primary" onClick={() => editor.setPanel('publish')}>
        Publish
        {errors.length ? <span className="rounded-full bg-white/25 px-1.5 text-xs">{errors.length}</span> : null}
      </Button>
    </header>
  )
}
