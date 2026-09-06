import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { aiApi, journeyApi } from '../lib/api'
import { getStyleConfig } from '../nodes/_core/registry'
import type { NodeStyle, ThemeConfig } from '../nodes/_core/types'
import LiveAdStage from '../components/preview/LiveAdStage'
import FloatingDevicePreview from '../components/preview/FloatingDevicePreview'
import { DEVICE_CHOICES, DEVICE_GROUPS, viewportForDevice, type FrameDevice } from '../components/preview/devices'
import { StyleConfigRouter } from '../nodes/_core/ConfigRouter'
import JourneyGraphEditor from '../components/journey/JourneyGraphEditor'
import { bus, useEvent } from '../lib/eventBus'
import { DEVICE_VIEWPORTS, isViewportId } from '../lib/viewports'
import { devLinkFor } from '../lib/devLink'
import { useCampaignJourney } from '../hooks/useCampaignJourney'
import { hasContent, effectiveTheme } from '../lib/journeyGraph'
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Check,
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  HelpCircle,
  Layers,
  Link2,
  LockKeyhole,
  MessageSquare,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Rocket,
  RotateCcw,
  Save,
  Smartphone,
  Target,
  Upload,
  Users,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from '../components/ui/Button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Label } from '../components/ui/Label'
import { Badge } from '../components/ui/Badge'
import { Separator } from '../components/ui/Separator'
import { Slider } from '../components/ui/Slider'

type Theme = ThemeConfig

const steps = [
  { id: 'campaign', title: 'Define', subtitle: 'Name, audience & objective', icon: Target },
  { id: 'journey', title: 'Journey', subtitle: 'Build the customer path', icon: Layers },
  { id: 'experience', title: 'Experience', subtitle: 'Style & interactions', icon: Palette },
  { id: 'knowledge', title: 'Knowledge', subtitle: 'Train campaign RAG', icon: Brain },
  { id: 'publish', title: 'Publish', subtitle: 'Live link & distribution', icon: Rocket },
] as const

function StatusPill({ kind, children }: { kind: 'success' | 'warning' | 'info' | 'muted'; children: React.ReactNode }) {
  return <Badge variant={kind}>{children}</Badge>
}

function StepSidebarHeader({ step, stepsList, setStep }: { step: number; stepsList: typeof steps; setStep: (n: number) => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {stepsList.map((s, index) => {
        const Icon = s.icon
        const isActive = step === index
        const isComplete = step > index
        return (
          <button
            key={s.id}
            onClick={() => setStep(index)}
            className={cn(
              'group flex w-full items-center gap-2 rounded-md border p-2 text-left transition-all',
              isActive && 'border-primary/50 bg-primary text-primary-foreground shadow-sm',
              !isActive && isComplete && 'border-primary/20 bg-primary/5 text-foreground hover:bg-primary/10',
              !isActive && !isComplete && 'border-transparent bg-transparent text-muted-foreground hover:bg-muted',
            )}
          >
            <div className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold transition',
              isActive && 'bg-primary-foreground/20 text-primary-foreground',
              !isActive && isComplete && 'bg-primary/15 text-primary',
              !isActive && !isComplete && 'bg-muted text-muted-foreground',
            )}>
              {isComplete ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className={cn('text-xs font-semibold', isActive ? 'text-primary-foreground' : 'text-foreground')}>
                {s.title}
              </div>
            </div>
          </button>
        )
      })}
    </nav>
  )
}

function CollapsedStepRail({
  step, stepsList, setStep, onExpand, progressPct,
}: {
  step: number
  stepsList: typeof steps
  setStep: (n: number) => void
  onExpand: () => void
  progressPct: number
}) {
  return (
    <>
      <div className="flex items-center justify-center border-b border-sidebar-border py-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onExpand}
          className="h-7 w-7 text-sidebar-foreground/70 hover:bg-sidebar-border hover:text-sidebar-foreground"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="h-3.5 w-3.5" />
        </Button>
      </div>
      <nav className="flex flex-1 flex-col items-stretch gap-1 overflow-y-auto px-1 py-2 scrollbar-thin">
        {stepsList.map((s, index) => {
          const Icon = s.icon
          const isActive = step === index
          const isComplete = step > index
          return (
            <button
              key={s.id}
              onClick={() => setStep(index)}
              title={`${s.title} · ${s.subtitle}`}
              aria-label={s.title}
              className={cn(
                'group relative flex h-8 w-8 items-center justify-center self-center rounded-md transition-all',
                isActive && 'bg-primary text-primary-foreground shadow-sm',
                !isActive && isComplete && 'bg-primary/15 text-primary hover:bg-primary/25',
                !isActive && !isComplete && 'text-sidebar-foreground/60 hover:bg-sidebar-border hover:text-sidebar-foreground',
              )}
            >
              {isComplete ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              {isActive && <span className="absolute right-0.5 top-0.5 h-1 w-1 animate-pulse rounded-full bg-primary-foreground" />}
            </button>
          )
        })}
      </nav>
      <div className="flex flex-col items-center gap-1 border-t border-sidebar-border py-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-sidebar-border">
          <span className="font-mono text-[9px] text-sidebar-foreground/80">{progressPct}%</span>
        </div>
      </div>
    </>
  )
}

function ExpandedSidebar({
  id, campaign, step, stepsList, setStep, progressPct, onCollapse,
}: {
  id: string
  campaign: any
  step: number
  stepsList: typeof steps
  setStep: (n: number) => void
  progressPct: number
  onCollapse: () => void
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-sidebar-border px-2 py-2">
        <Link
          to={`/campaigns/${id}`}
          className="inline-flex min-w-0 items-center gap-1 text-[11px] text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground"
          title="Campaign overview"
        >
          <ArrowLeft className="h-3 w-3" />
          <span className="truncate">Overview</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCollapse}
          className="h-7 w-7 text-sidebar-foreground/60 hover:bg-sidebar-border hover:text-sidebar-foreground"
          aria-label="Collapse sidebar"
          title="Collapse sidebar (give canvas more room)"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex items-center border-b border-sidebar-border px-2 py-2">
        <h2 className="truncate text-xs font-semibold text-sidebar-foreground">
          {campaign?.name || 'Campaign workspace'}
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin">
        <StepSidebarHeader step={step} stepsList={stepsList} setStep={setStep} />
      </div>
      <div className="border-t border-sidebar-border px-2 py-2">
        <div className="flex items-center justify-between text-[11px] text-sidebar-foreground/60">
          <span>Workspace progress</span>
          <span className="font-mono text-sidebar-foreground">{progressPct}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sidebar-border">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
    </>
  )
}

export default function CampaignSetup() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialStep = (() => {
    const s = searchParams.get('step')
    if (s !== null) {
      const n = parseInt(s, 10)
      if (!isNaN(n) && n >= 0 && n < steps.length) return n
      const idx = steps.findIndex(x => x.id === s)
      if (idx !== -1) return idx
    }
    try { const v = localStorage.getItem(`workspace:${id}:step`); if (v !== null) { const n = parseInt(v, 10); if (!isNaN(n) && n >=0 && n < steps.length) return n } } catch {}
    return 0
  })()
  const [step, setStep] = useState(initialStep)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('workspace:sidebarCollapsed') === '1' } catch { return false }
  })
  const journey = useCampaignJourney(id)
  const [campaign, setCampaign] = useState<any>(null)
  const [name, setName] = useState('')
  const [objective, setObjective] = useState('')
  const [audience, setAudience] = useState('')
  const [brief, setBrief] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [expDevice, setExpDevice] = useState<FrameDevice>('iphone-16-pro')
  const [website, setWebsite] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [knowledgeStatus, setKnowledgeStatus] = useState<{ kind: 'loading' | 'success' | 'error'; message: string } | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [publishStatus, setPublishStatus] = useState<{ kind: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [styleSaveStatus, setStyleSaveStatus] = useState<{ kind: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [devCopied, setDevCopied] = useState(false)
  useEffect(() => {
    try { localStorage.setItem(`workspace:${id}:step`, String(step)) } catch {}
    const cur = searchParams.get('step')
    if (cur !== String(step)) {
      const next = new URLSearchParams(searchParams)
      next.set('step', String(step))
      setSearchParams(next, { replace: true })
    }
  }, [step, id])
  useEffect(() => {
    try { localStorage.setItem('workspace:sidebarCollapsed', sidebarCollapsed ? '1' : '0') } catch {}
  }, [sidebarCollapsed])
  useEffect(() => {
    const onPop = () => {
      const s = new URLSearchParams(window.location.search).get('step')
      if (s !== null) {
        const n = parseInt(s, 10)
        if (!isNaN(n) && n >= 0 && n < steps.length) setStep(n)
        else {
          const idx = steps.findIndex(x => x.id === s)
          if (idx !== -1) setStep(idx)
        }
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const hasSyncedUrlRef = useRef(false)
  useEffect(() => {
    if (hasSyncedUrlRef.current || journey.status !== 'loaded') return
    const qp = new URLSearchParams(window.location.search)
    const qpNode = qp.get('node')
    const qpViewport = qp.get('viewport')
    let did = false
    if (qpNode && journey.graph.nodes.some(n => n.id === qpNode)) { bus.emit('node:select', { nodeId: qpNode, source: 'toolbar' }); did = true }
    if (isViewportId(qpViewport)) { bus.emit('device:viewportChange', { viewportId: qpViewport, width: DEVICE_VIEWPORTS[qpViewport].width, height: DEVICE_VIEWPORTS[qpViewport].height }); did = true }
    if (did) hasSyncedUrlRef.current = true
  }, [journey.status, journey.graph])
  useEffect(() => {
    const hNode = (p: any) => {
      if (p.source === 'device') return
      if (!p.nodeId) {
        setSearchParams(prev => {
          const next = new URLSearchParams(prev)
          if (next.has('node')) { next.delete('node'); return next }
          return prev
        }, { replace: true })
        return
      }
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (next.get('node') !== p.nodeId) { next.set('node', p.nodeId); return next }
        return prev
      }, { replace: true })
    }
    const hVp = (p: any) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (next.get('viewport') !== p.viewportId) { next.set('viewport', p.viewportId); return next }
        return prev
      }, { replace: true })
    }
    bus.on('node:select', hNode as any)
    bus.on('device:viewportChange', hVp as any)
    return () => { bus.off('node:select', hNode as any); bus.off('device:viewportChange', hVp as any) }
  }, [])

  useEvent('node:select', useCallback((p: any) => setSelectedNodeId(p.nodeId), []))

  useEffect(() => {
    if (selectedNodeId && !journey.graph.nodes.some(n => n.id === selectedNodeId)) {
      setSelectedNodeId(null)
    }
  }, [journey.graph, selectedNodeId])

  const updateNodeTheme = (key: keyof Theme, value: string | number) => {
    if (!selectedNodeId) return
    journey.applyNodePatch(selectedNodeId, { theme: { [key]: value } })
    bus.emit('node:update', { nodeId: selectedNodeId, config: { theme: { [key]: value } } })
  }

  const updateNodeStyle = (key: keyof NodeStyle, value: any) => {
    if (!selectedNodeId) return
    journey.applyNodePatch(selectedNodeId, { style: { [key]: value } })
    bus.emit('node:update', { nodeId: selectedNodeId, style: { [key]: value } as NodeStyle })
  }

  const updateNodeConfig = (next: any) => {
    if (!selectedNodeId) return
    journey.applyNodePatch(selectedNodeId, { config: next })
    bus.emit('node:update', { nodeId: selectedNodeId, config: next })
  }

  useEffect(() => {
    if (!id) return
    journeyApi.get(`/api/campaigns/${id}`).then(response => {
      setCampaign(response.data)
      setName(response.data.name || '')
      setObjective(response.data.objective || '')
      setAudience(response.data.audience || '')
      setBrief(response.data.description || '')
    }).catch(() => navigate('/campaigns'))
  }, [id])

  useEffect(() => {
    if (id) journey.load()
  }, [id])

  useEffect(() => {
    if (step === 1 || step === 2) setSidebarCollapsed(true)
    else setSidebarCollapsed(false)
  }, [step])

  const prevSaveStateRef = useRef(journey.saveState)
  useEffect(() => {
    const prev = prevSaveStateRef.current
    prevSaveStateRef.current = journey.saveState
    if (step !== 2) return
    if (journey.saveState === 'saving') {
      setStyleSaveStatus({ kind: 'info', message: 'Saving styles…' })
    } else if (journey.saveState === 'clean' && prev === 'saving') {
      setStyleSaveStatus({ kind: 'success', message: 'Styles saved' })
    } else if (journey.saveState === 'error') {
      setStyleSaveStatus({ kind: 'error', message: journey.error || 'Could not save styles. Check your connection and try again.' })
    }
  }, [journey.saveState, journey.error, step])
  useEffect(() => {
    if (styleSaveStatus?.kind !== 'success') return
    const t = setTimeout(() => setStyleSaveStatus(null), 2000)
    return () => clearTimeout(t)
  }, [styleSaveStatus])

  useEffect(() => {
    if (step !== 2) return
    if (journey.saveState !== 'dirty') return
    const t = setTimeout(() => { journey.save() }, 800)
    return () => clearTimeout(t)
  }, [step, journey.saveState, journey.save])

  const productLink = useMemo(() => `${window.location.origin}/c/${id}`, [id])
  const devLink = useMemo(() => campaign?.devToken ? devLinkFor(campaign.devToken) : '', [campaign?.devToken])
  const isPublished = journey.journeyStatus === 'PUBLISHED'
  const shareLink = useMemo(() => isPublished ? productLink : (devLink || productLink), [isPublished, devLink, productLink])
  const updateTheme = (key: keyof Theme, value: string | number) => {
    journey.applyGraph({ ...journey.graph, theme: { ...journey.graph.theme, [key]: value } })
  }

  const saveDetails = async () => {
    if (!name.trim()) return
    try {
      const response = await journeyApi.put(`/api/campaigns/${id}`, { name, description: brief, objective, audience })
      setCampaign(response.data)
      setStep(1)
    } catch { setCampaign((current: any) => ({ ...current, name, description: brief, objective, audience })) ; setStep(1) }
  }

  const ingestWebsite = async () => {
    if (!website.trim()) return
    setKnowledgeStatus({ kind: 'loading', message: 'Training campaign knowledge…' })
    try {
      const response = await aiApi.post('/v1/knowledge/sources/web', { url: website, title: `${name} campaign source` })
      setKnowledgeStatus({ kind: 'success', message: `Website trained — ${response.data.chunks} knowledge chunks are ready for retrieval.` })
      setWebsite('')
    } catch { setKnowledgeStatus({ kind: 'error', message: 'The website could not be ingested. Confirm the URL is publicly reachable and try again.' }) }
  }

  const ingestQa = async () => {
    if (!question.trim() || !answer.trim()) return
    setKnowledgeStatus({ kind: 'loading', message: 'Training campaign knowledge…' })
    try {
      const response = await aiApi.post('/v1/knowledge/sources/qa', { question, answer })
      setKnowledgeStatus({ kind: 'success', message: `Answer trained — ${response.data.chunks} knowledge chunk is ready for retrieval.` })
      setQuestion(''); setAnswer('')
    } catch { setKnowledgeStatus({ kind: 'error', message: 'The answer could not be trained. Please try again.' }) }
  }

  const ingestPdf = async (file?: File) => {
    if (!file) return
    setKnowledgeStatus({ kind: 'loading', message: 'Uploading and training PDF…' })
    const data = new FormData(); data.append('file', file); data.append('title', `${name} campaign document`)
    try {
      const response = await aiApi.post('/v1/knowledge/sources/pdf', data)
      setKnowledgeStatus({ kind: 'success', message: `PDF trained — ${response.data.chunks} knowledge chunks are ready for retrieval.` })
    } catch { setKnowledgeStatus({ kind: 'error', message: 'The PDF could not be ingested. Try another file.' }) }
  }

  const publish = async () => {
    if (!journey.journeyId) { setPublishStatus({ kind: 'error', message: 'Create and save a journey before publishing.' }); return }
    setPublishing(true); setPublishStatus({ kind: 'info', message: 'Validating and publishing…' })
    const res = await journey.publish()
    if (res.ok) {
      setPublishStatus({ kind: 'success', message: 'Published successfully. Your campaign link is ready to share.' })
    } else {
      const messages = res.errors?.map((item: any) => item.message).filter(Boolean).join(' ') || 'Resolve journey validation issues and try again.'
      setPublishStatus({ kind: 'error', message: messages })
    }
    setPublishing(false)
  }

  const copyShareLink = () => {
    navigator.clipboard?.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  const copyDevLink = () => {
    if (!devLink) return
    navigator.clipboard?.writeText(devLink)
    setDevCopied(true)
    setTimeout(() => setDevCopied(false), 1800)
  }
  const rotateDevLink = async () => {
    if (!id) return
    const res = await journeyApi.post(`/api/campaigns/${id}/dev-link/rotate`)
    setCampaign((prev: any) => prev ? { ...prev, devToken: res.data.devToken } : prev)
    bus.emit('campaign:devLinkRotated', { campaignId: id, devToken: res.data.devToken })
  }

  const styleableNodes = useMemo(() => journey.graph.nodes.filter(n => getStyleConfig(n.type) != null), [journey.graph])
  const selectedNode = selectedNodeId ? journey.graph.nodes.find(n => n.id === selectedNodeId) ?? null : null
  const selectedNodeTheme = useMemo(() => effectiveTheme(journey.graph, selectedNodeId), [journey.graph, selectedNodeId])
  const progressPct = useMemo(() => {
    const known = [Boolean(name.trim()), Boolean(journey.journeyId), hasContent(journey.graph), Boolean(knowledgeStatus?.kind === 'success'), Boolean(publishStatus?.kind === 'success')]
    const done = known.filter(Boolean).length
    return Math.round((done / known.length) * 100)
  }, [name, journey.journeyId, journey.graph, knowledgeStatus, publishStatus])

  const currentStep = steps[step]
  const StepIcon = currentStep.icon

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex',
          sidebarCollapsed ? 'w-10' : 'w-44',
        )}
      >
        {sidebarCollapsed ? (
          <CollapsedStepRail step={step} stepsList={steps} setStep={setStep} onExpand={() => setSidebarCollapsed(false)} progressPct={progressPct} />
        ) : (
          <ExpandedSidebar
            id={id}
            campaign={campaign}
            step={step}
            stepsList={steps}
            setStep={setStep}
            progressPct={progressPct}
            onCollapse={() => setSidebarCollapsed(true)}
          />
        )}
      </aside>

      {/* Main */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between gap-2 border-b bg-background px-3 py-1.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <StepIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {step + 1} of {steps.length}
                </span>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-xs text-muted-foreground">{currentStep.subtitle}</span>
              </div>
              <h1 className="text-lg font-semibold text-foreground">{currentStep.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {campaign?.devToken && (
              <Badge variant="outline" className="hidden font-mono text-[10px] sm:inline-flex gap-1">
                DEV · /d/{campaign.devToken.slice(0,8)}
                <button onClick={copyDevLink} className="ml-1 rounded p-0.5 hover:bg-muted"><Copy className="h-3 w-3" /></button>
                <button onClick={rotateDevLink} className="ml-0.5 rounded p-0.5 hover:bg-muted" title="Rotate dev link"><RotateCcw className="h-3 w-3" /></button>
                {devCopied && <span className="text-emerald-600">Copied</span>}
              </Badge>
            )}
            <Badge variant="muted" className="hidden font-mono text-[10px] sm:inline-flex">
              <LockKeyhole className="mr-1 h-3 w-3" />
              {id.slice(0, 8)}
            </Badge>
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStep(s => Math.max(0, s - 1))} className="gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            )}
            {step < steps.length - 1 && step !== 1 && step !== 2 && (
              <Button
                size="sm"
                onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}
                className="gap-1.5"
                disabled={step === 0 && !name.trim()}
              >
                Skip
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col animate-fade-in overflow-hidden">
            {step === 0 && (
              <Card className="border-border/60 shadow-soft">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <StatusPill kind="info">Step 1</StatusPill>
                    <StatusPill kind="muted">~2 min</StatusPill>
                  </div>
                  <CardTitle className="text-xl">Define the campaign</CardTitle>
                  <CardDescription>
                    Start with the context your team needs to build a focused journey.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="campaign-name">
                      Campaign name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="campaign-name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Summer product launch"
                      className="h-9"
                    />
                    <p className="text-xs text-muted-foreground">A short, recognizable label shown across the product.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="objective" className="flex items-center gap-1">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        Objective
                      </Label>
                      <Input
                        id="objective"
                        value={objective}
                        onChange={e => setObjective(e.target.value)}
                        placeholder="Drive qualified leads"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="audience" className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        Audience
                      </Label>
                      <Input
                        id="audience"
                        value={audience}
                        onChange={e => setAudience(e.target.value)}
                        placeholder="Returning site visitors"
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="brief" className="flex items-center gap-1">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      Campaign brief
                    </Label>
                    <Textarea
                      id="brief"
                      value={brief}
                      onChange={e => setBrief(e.target.value)}
                      placeholder="Describe the offer, message, and the action you want the customer to take."
                      className="min-h-[100px]"
                    />
                  </div>
                </CardContent>
                <div className="flex items-center justify-between border-t bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">You can edit any of this later.</p>
                  <Button onClick={saveDetails} disabled={!name.trim()} className="gap-2">
                    Continue to journey
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}

            {step === 1 && (
              <div className="flex h-full min-h-0 flex-col gap-2">
                <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-background shadow-soft">
                  <JourneyGraphEditor
                    graph={journey.graph}
                    onGraphChange={journey.applyGraph}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={setSelectedNodeId}
                  />
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <div className="flex items-center gap-2">
                    {journey.journeyId && <Badge variant="muted" className="font-mono text-[10px]">{journey.journeyId.slice(0, 8)}</Badge>}
                    <Button onClick={() => journey.save()} size="sm" disabled={journey.saveState === 'saving' || journey.status !== 'loaded'} className="h-8 gap-1.5">
                      <Save className="h-3.5 w-3.5" />
                      {journey.saveState === 'saving' ? 'Saving…' : 'Save journey'}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    {journey.saveState === 'error' && journey.error && <span className="text-xs text-destructive">{journey.error}</span>}
                    <Button
                      onClick={async () => { await journey.save(); setStep(2) }}
                      variant="default"
                      disabled={journey.saveState === 'saving' || journey.status !== 'loaded'}
                      className="gap-2"
                    >
                      {journey.saveState === 'saving' ? 'Saving…' : 'Save and continue'}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <FloatingDevicePreview
                  start={{ mode: 'test', campaignId: id, journeyId: journey.journeyId || undefined }}
                  viewportId="iphone14"
                  studio
                  askAiConfig={hasContent(journey.graph) ? (journey.graph.nodes.find(n => n.type === 'ask_ai')?.config ?? null) : undefined}
                />
              </div>
            )}

            {step === 2 && (
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden">
                  <Card className="flex min-h-[420px] flex-col overflow-hidden bg-card shadow-sm lg:min-h-0">
                    <div className="flex shrink-0 items-center gap-2 border-b bg-muted/20 px-3 py-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                      <select value={expDevice} onChange={e => setExpDevice(e.target.value as FrameDevice)} className="h-7 min-w-0 flex-1 rounded-md border bg-background px-1.5 text-xs font-medium" aria-label="Preview device">
                        {DEVICE_GROUPS.map(g => (
                          <optgroup key={g} label={g}>
                            {DEVICE_CHOICES.filter(c => c.group === g).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col p-2">
                      {hasContent(journey.graph) ? (
                        <div className="h-full min-h-[420px]">
                          <LiveAdStage start={{ mode: 'test', campaignId: id, journeyId: journey.journeyId || undefined, devToken: campaign?.devToken }} viewportId={viewportForDevice(expDevice)} device={expDevice} framed studio askAiConfig={journey.graph.nodes.find(n => n.type === 'ask_ai')?.config ?? null} />
                        </div>
                      ) : (
                        <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-dashed bg-muted/20">
                          <div className="max-w-sm text-center p-6">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-background border shadow-sm">
                              <Eye className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <h3 className="text-sm font-semibold">Save a journey first</h3>
                            <p className="mt-1 text-xs text-muted-foreground">Your interactive preview will appear here once you save a flow.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className="flex min-h-0 flex-col overflow-hidden shadow-sm">
                    <div className="flex items-center gap-2 border-b bg-muted/20 px-3 py-2 shrink-0">
                      <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">Active node</span>
                      <select aria-label="Active node" value={selectedNodeId || ''} onChange={e => { const v = e.target.value || null; setSelectedNodeId(v); bus.emit('node:select', { nodeId: v, source: 'toolbar' }) }} className="flex-1 rounded-md border bg-background px-2 py-1 text-xs">
                        <option value="">Global theme</option>
                        {styleableNodes.map(n => (
                          <option key={n.id} value={n.id}>{n.type.replace(/_/g, ' ')} · {n.id.slice(0,4)}</option>
                        ))}
                      </select>
                      {selectedNode && <Badge variant="outline" className="font-mono text-[10px]">{selectedNode.type.replace(/_/g,' ')}</Badge>}
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-3 scrollbar-thin">
                      {selectedNode ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold capitalize">{selectedNode.type.replace(/_/g,' ')}</h3>
                            <Badge variant="outline" className="font-mono text-[10px]">{selectedNode.id.slice(0,6)}</Badge>
                          </div>
                          <StyleConfigRouter type={selectedNode.type} style={selectedNode.config.style || {}} onChange={(k,v)=> updateNodeStyle(k,v)} theme={selectedNodeTheme} config={selectedNode.config} onConfigChange={updateNodeConfig} />
                          <Button variant="outline" size="sm" onClick={() => selectedNodeId && journey.applyNodePatch(selectedNodeId, { style: null, theme: null })} className="w-full gap-2">Reset node style</Button>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedNodeId(null); bus.emit('node:select', { nodeId: null, source: 'toolbar' }) }} className="w-full">Close</Button>
                        </div>
                      ) : (
                        <GlobalThemeEditor theme={journey.graph.theme} updateTheme={updateTheme} />
                      )}
                    </div>
                    <div className="border-t p-2 bg-muted/10 flex items-center gap-2">
                      <Button size="sm" onClick={() => journey.save()} className="flex-1 gap-1.5"><Save className="h-3.5 w-3.5" /> Save styles</Button>
                      {styleSaveStatus ? <PublishStatusBanner status={styleSaveStatus} /> : <span className="text-[10px] text-muted-foreground">Auto-saves</span>}
                    </div>
                  </Card>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-2">
                <Card className="border-border/60 shadow-soft">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <StatusPill kind="info">Step 4</StatusPill>
                      <StatusPill kind="muted">RAG sources</StatusPill>
                    </div>
                    <CardTitle className="text-xl">Train campaign knowledge</CardTitle>
                    <CardDescription>
                      When a customer leaves the configured journey or asks an unanswered question, the AI can retrieve from the approved campaign material below.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-3">
                      <KnowledgeCard
                        icon={<Globe className="h-3.5 w-3.5" />}
                        title="Website source"
                        description="Ingest a public URL to seed retrieval-augmented answers."
                        footer={
                          <div className="flex gap-1.5">
                            <Input
                              value={website}
                              onChange={e => setWebsite(e.target.value)}
                              placeholder="https://example.com/offer"
                              className="h-8 flex-1 text-xs"
                            />
                            <Button onClick={ingestWebsite} size="sm" className="h-8">
                              Train
                            </Button>
                          </div>
                        }
                      />
                      <KnowledgeCard
                        icon={<Upload className="h-3.5 w-3.5" />}
                        title="PDF document"
                        description="Upload a campaign PDF to chunk into the retrieval index."
                        footer={
                          <label className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed bg-muted/40 px-2 text-xs text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5">
                            <Upload className="h-3 w-3" />
                            <span>Choose PDF file</span>
                            <input
                              type="file"
                              accept="application/pdf"
                              onChange={e => ingestPdf(e.target.files?.[0])}
                              className="hidden"
                            />
                          </label>
                        }
                      />
                      <KnowledgeCard
                        icon={<MessageSquare className="h-3.5 w-3.5" />}
                        title="Approved Q&A"
                        description="Pin a question and answer pair to the knowledge base."
                        footer={
                          <div className="space-y-1.5">
                            <Input
                              value={question}
                              onChange={e => setQuestion(e.target.value)}
                              placeholder="What does delivery cost?"
                              className="h-8 text-xs"
                            />
                            <Textarea
                              value={answer}
                              onChange={e => setAnswer(e.target.value)}
                              placeholder="Provide the approved answer customers should receive."
                              className="min-h-[60px] text-xs"
                            />
                            <Button onClick={ingestQa} size="sm" className="h-8 w-full">
                              Train answer
                            </Button>
                          </div>
                        }
                      />
                    </div>
                  </CardContent>
                  {knowledgeStatus && (
                    <div className="px-3 pb-3">
                      <KnowledgeStatusBanner status={knowledgeStatus} />
                    </div>
                  )}
                </Card>

                <div className="flex justify-end">
                  <Button onClick={() => setStep(4)} className="gap-2">
                    Continue to publish
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-2">
                <Card className="border-border/60 shadow-soft">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <StatusPill kind="success">Final step</StatusPill>
                      <StatusPill kind="muted">Launch</StatusPill>
                    </div>
                    <CardTitle className="text-xl">Publish and share</CardTitle>
                    <CardDescription>
                      Publishing runs the journey validation gate before your campaign can be distributed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg',
                            journey.journeyId ? 'bg-amber-500/15 text-amber-700' : 'bg-muted text-muted-foreground',
                          )}>
                            <Layers className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Journey readiness</p>
                            <p className="text-[11px] text-muted-foreground">
                              {journey.journeyId
                                ? 'Your saved journey will be validated and marked published.'
                                : 'Return to the journey step and save a flow first.'}
                            </p>
                          </div>
                        </div>
                        <StatusPill kind={journey.journeyId ? 'warning' : 'muted'}>
                          {journey.journeyId ? (journey.journeyStatus || 'DRAFT') : 'No journey'}
                        </StatusPill>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        onClick={publish}
                        disabled={!journey.journeyId || publishing}
                        className="gap-2"
                      >
                        <Rocket className="h-4 w-4" />
                        {publishing ? 'Publishing…' : 'Publish campaign'}
                      </Button>
                      {publishStatus && <PublishStatusBanner status={publishStatus} />}
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-0 bg-foreground text-background shadow-elevated">
                  <div className="relative">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <StatusPill kind={isPublished ? "success" : "warning"}>
                          <span className="mr-1.5 inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                          {isPublished ? "Live" : "DEV preview"}
                        </StatusPill>
                        <span className="text-xs text-background/60">{isPublished ? "Product link" : "DEV preview link"}</span>
                      </div>
                      <CardTitle className="text-background">{isPublished ? "Share with your audience" : "Preview before publish"}</CardTitle>
                      <CardDescription className="text-background/60">
                        {isPublished ? "Your journey is published. This product link works for anyone and is ready for ads." : "Not published yet. This DEV link is unguessable, noindex, and works without publishing for internal review."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-1.5 rounded-lg border border-background/15 bg-background/10 p-1.5">
                        <Link2 className="ml-1.5 h-3.5 w-3.5 shrink-0 text-background/60" />
                        <code className="flex-1 truncate font-mono text-xs text-background/90">{shareLink}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copyShareLink}
                          className="h-7 shrink-0 text-background hover:bg-background/15 hover:text-background"
                        >
                          {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                        </Button>
                        <a
                          href={shareLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-background/80 transition-colors hover:bg-background/15 hover:text-background"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open
                        </a>
                      </div>
                      {isPublished && devLink && (
                        <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 p-1.5">
                          <span className="ml-1.5 text-[10px] font-mono text-white/60">DEV</span>
                          <code className="flex-1 truncate font-mono text-[11px] text-white/70">{devLink}</code>
                          <Button variant="ghost" size="sm" onClick={copyDevLink} className="h-6 shrink-0 text-white/70 hover:bg-white/10 hover:text-white text-xs">{devCopied ? "Copied" : "Copy DEV"}</Button>
                        </div>
                      )}
                      {!isPublished && (
                        <div className="text-[11px] text-white/50">Product link after publish will be <code className="font-mono text-white/70">{productLink}</code> (shows &#34;not live yet&#34; until you publish).</div>
                      )}
                    </CardContent>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function KnowledgeCard({
  icon, title, description, footer,
}: { icon: React.ReactNode; title: string; description: string; footer: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-lg border bg-card p-2.5 shadow-soft">
      <div className="flex items-center gap-1.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="mt-1.5 flex-1 text-xs text-muted-foreground">{description}</p>
      <div className="mt-2">{footer}</div>
    </div>
  )
}

function KnowledgeStatusBanner({ status }: { status: { kind: 'loading' | 'success' | 'error'; message: string } }) {
  const tone =
    status.kind === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
      : status.kind === 'error'
        ? 'border-destructive/30 bg-destructive/10 text-destructive'
        : 'border-primary/30 bg-primary/10 text-primary'
  const icon =
    status.kind === 'success' ? <CheckCircle2 className="h-4 w-4" />
    : status.kind === 'error' ? <HelpCircle className="h-4 w-4" />
    : <Circle className="h-4 w-4 animate-pulse" />
  return (
    <div className={cn('flex items-start gap-1.5 rounded-md border px-2 py-1.5 text-xs', tone)}>
      <span className="mt-0.5">{icon}</span>
      <span>{status.message}</span>
    </div>
  )
}

function PublishStatusBanner({ status }: { status: { kind: 'success' | 'error' | 'info'; message: string } }) {
  const tone =
    status.kind === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
      : status.kind === 'error'
        ? 'border-destructive/30 bg-destructive/10 text-destructive'
        : 'border-primary/30 bg-primary/10 text-primary'
  return (
    <div className={cn('flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs', tone)}>
      {status.kind === 'success' && <CheckCircle2 className="h-4 w-4" />}
      {status.kind === 'error' && <HelpCircle className="h-4 w-4" />}
      {status.kind === 'info' && <Circle className="h-4 w-4 animate-pulse" />}
      <span>{status.message}</span>
    </div>
  )
}

function ColorField({
  label, value, onChange, hint,
}: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium capitalize text-muted-foreground">{label}</span>
        <span className="font-mono text-[10px] text-muted-foreground">{value}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative h-9 w-12 shrink-0 overflow-hidden rounded-md border">
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer border-0 bg-transparent p-0"
          />
        </div>
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#000000"
          className="h-9 font-mono text-xs"
        />
      </div>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function GlobalThemeEditor({ theme, updateTheme }: { theme: Theme; updateTheme: (k: keyof Theme, v: string | number) => void }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Palette className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Global theme</h3>
          <p className="text-xs text-muted-foreground">Default style applied to every node.</p>
        </div>
      </div>

      <Separator className="my-5" />

      <div className="grid grid-cols-2 gap-3">
        {(['primary', 'accent', 'surface', 'foreground'] as const).map(key => (
          <ColorField
            key={key}
            label={key}
            value={theme[key]}
            onChange={v => updateTheme(key, v)}
          />
        ))}
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">Corner radius</span>
          <span className="font-mono text-[10px] text-muted-foreground">{theme.radius}px</span>
        </div>
        <Slider
          min={0}
          max={32}
          value={theme.radius}
          onChange={e => updateTheme('radius', Number(e.target.value))}
        />
      </div>

      <div className="mt-5 space-y-2">
        <Label htmlFor="cta-label" className="text-xs">Default CTA label</Label>
        <Input
          id="cta-label"
          value={theme.cta}
          onChange={e => updateTheme('cta', e.target.value)}
          placeholder="Explore the collection"
          className="h-9"
        />
      </div>

      <div className="mt-5 rounded-lg border bg-muted/30 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Preview</p>
        <div
          className="flex items-center justify-center p-6 text-center"
          style={{ background: theme.surface, color: theme.foreground, borderRadius: `${theme.radius}px` }}
        >
          <div>
            <div className="text-base font-semibold" style={{ color: theme.primary }}>Your brand lives here.</div>
            <div className="mt-1 text-xs opacity-70">A small preview of the global theme.</div>
            <div
              className="mx-auto mt-3 inline-block px-3 py-1 text-xs font-medium"
              style={{ background: theme.accent, color: theme.surface, borderRadius: `${theme.radius}px` }}
            >
              {theme.cta}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
