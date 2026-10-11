import { isProblem } from '@shared/api/problem'
import { strings } from '@shared/strings'
import { lazy, Suspense, useLayoutEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { GenerationOverlay } from '../campaign/GenerateProgress'
import { AllDevices } from '../canvas/AllDevices'
import { ScreenCanvas } from '../canvas/ScreenCanvas'
import { Inspector } from '../inspector/Inspector'
import { OutlinePanel } from '../outline/OutlinePanel'
import { PlayOverlay } from '../play/PlayOverlay'
import { ConflictDialog } from '../publish/ConflictDialog'
import { PublishDialog } from '../publish/PublishDialog'
import { VersionsDialog } from '../publish/VersionsDialog'
import { useCampaign, useWorkspace } from '../queries/campaigns'
import type { CampaignSummary, Workspace as WorkspaceData } from '../queries/types'
import { useEditor } from '../store'
import { useSelectedScreenId } from '../store/commands'
import { useAutosave } from '../sync/autosave'
import { useOtherTabs } from '../sync/broadcast'
import { TokenGate } from '../TokenGate'
import { Segmented } from '../ui/Segmented'
import { Coachmarks } from './Coachmarks'
import { SettingsDialog } from './SettingsDialog'
import { useShortcuts } from './shortcuts'
import { TopBar } from './TopBar'
import { useWorkspaceLoader } from './useWorkspaceLoader'

const FlowCanvas = lazy(() => import('../flow/FlowCanvas').then(module => ({ default: module.FlowCanvas })))
const ChatTab = lazy(() => import('../tabs/ChatTab').then(module => ({ default: module.ChatTab })))
const ResultsTab = lazy(() => import('../tabs/ResultsTab').then(module => ({ default: module.ResultsTab })))
const ShareTab = lazy(() => import('../tabs/ShareTab').then(module => ({ default: module.ShareTab })))

export function WorkspacePage() {
  const { id = '' } = useParams()
  const campaign = useCampaign(id)
  const workspace = useWorkspace(id)
  if (isProblem(campaign.error, 401) || isProblem(workspace.error, 401)) return <TokenGate />
  if (campaign.isError || workspace.isError) return <p className="p-10 text-rose-700">{strings.loadFailed}</p>
  if (!campaign.data || !workspace.data) return <p className="p-10 text-slate-500">{strings.loading}</p>
  return <Loaded campaign={campaign.data} workspace={workspace.data} />
}

function Loaded({ campaign, workspace }: { campaign: CampaignSummary; workspace: WorkspaceData }) {
  const ready = useWorkspaceLoader(campaign.id, workspace)
  useAutosave(campaign.id, ready)
  useShortcuts(ready)
  const others = useOtherTabs(campaign.id)
  const tab = useEditor(state => state.tab)
  const [params, setParams] = useSearchParams()
  const job = params.get('job')
  const closeJob = () => {
    const next = new URLSearchParams(params)
    next.delete('job')
    setParams(next, { replace: true })
  }
  const retryJob = (jobId: string) => {
    const next = new URLSearchParams(params)
    next.set('job', jobId)
    setParams(next, { replace: true })
  }
  if (!ready) return <p className="p-10 text-slate-500">{strings.loading}</p>
  return (
    <div className="flex h-full flex-col">
      <TopBar campaign={campaign} workspace={workspace} />
      {others ? (
        <p role="status" className="bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900">
          This campaign is also open in another tab. Changes made there may conflict with yours.
        </p>
      ) : null}
      <div className="relative flex min-h-0 flex-1">
        <Suspense fallback={<p className="p-10 text-slate-500">{strings.loading}</p>}>
          {tab === 'build' || tab === 'design' ? <BuildArea campaignId={campaign.id} workspace={workspace} /> : null}
          {tab === 'chat' ? <ChatTab campaignId={campaign.id} /> : null}
          {tab === 'share' ? <ShareTab campaign={campaign} workspace={workspace} /> : null}
          {tab === 'results' ? <ResultsTab campaign={campaign} /> : null}
        </Suspense>
      </div>
      <PublishDialog campaign={campaign} workspace={workspace} />
      <VersionsDialog campaignId={campaign.id} />
      <SettingsDialog campaignId={campaign.id} workspace={workspace} />
      <ConflictDialog campaignId={campaign.id} />
      <PlayOverlay campaignId={campaign.id} />
      <Coachmarks campaignId={campaign.id} workspace={workspace} />
      {job ? <GenerationOverlay campaignId={campaign.id} jobId={job} onClose={closeJob} onRetry={retryJob} /> : null}
      <p className="fixed inset-x-0 bottom-0 z-50 bg-slate-900 px-4 py-2 text-center text-xs text-white min-[1280px]:hidden">
        The editor works best on a screen at least 1280 pixels wide.
      </p>
    </div>
  )
}

function BuildArea({ campaignId, workspace }: { campaignId: string; workspace: WorkspaceData }) {
  const canvas = useEditor(state => state.canvas)
  const screenId = useSelectedScreenId()
  const lastScreen = useRef<string | null>(null)
  if (screenId) lastScreen.current = screenId
  const area = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(900)
  useLayoutEffect(() => {
    const node = area.current
    if (!node) return
    const observer = new ResizeObserver(() => setWidth(node.clientWidth))
    observer.observe(node)
    setWidth(node.clientWidth)
    return () => observer.disconnect()
  }, [])
  const shown = screenId ?? lastScreen.current
  return (
    <>
      <OutlinePanel campaignId={campaignId} ops={workspace.ops} />
      <main
        ref={area}
        className="relative min-w-0 flex-1 overflow-auto bg-slate-100"
        aria-label="Canvas"
        data-coachmark="edit"
      >
        <div className="absolute top-3 left-3 z-10 w-40">
          <Segmented
            label="Canvas view"
            size="sm"
            value={canvas === 'flow' ? 'flow' : 'screen'}
            options={[
              { value: 'screen', label: 'Screen' },
              { value: 'flow', label: 'Flow' },
            ]}
            onChange={value => useEditor.getState().setCanvas(value)}
          />
        </div>
        {canvas === 'flow' ? (
          <FlowCanvas />
        ) : canvas === 'all' ? (
          <AllDevices screenId={shown} />
        ) : (
          <ScreenCanvas screenId={shown} available={width} />
        )}
      </main>
      <Inspector />
    </>
  )
}
