import type { Breakpoint } from '@experience/index'
import { stepById } from '@journey/ports'
import { stepName } from '@journey/summary'
import { cn } from '@shared/ui/cn'
import { Monitor, RotateCcw, Smartphone, Tablet, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DEVICE_HEIGHT, DEVICE_WIDTH } from '../canvas/DeviceFrame'
import { useChecklist } from '../outline/ReadyChecklist'
import { useEditor } from '../store'
import { Button } from '../ui/Button'
import { PlayFrame, type StepInfo } from './PlayFrame'

const SYSTEM = new Set(['device', 'locale', 'referrer', 'now', 'score', 'outcomes'])

export function PlayOverlay({ campaignId }: { campaignId: string }) {
  const playing = useEditor(state => state.playing)
  if (!playing) return null
  return <Overlay campaignId={campaignId} />
}

function Overlay({ campaignId }: { campaignId: string }) {
  const doc = useEditor(state => state.doc)
  const from = useEditor(state => state.playFrom)
  const initial = useEditor(state => state.breakpoint)
  const [device, setDevice] = useState<Breakpoint>(initial)
  const [run, setRun] = useState(0)
  const [info, setInfo] = useState<StepInfo | null>(null)
  const [path, setPath] = useState<string[]>([])
  const [devices, setDevices] = useState<Set<Breakpoint>>(() => new Set([initial]))
  const stage = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: 800, height: 600 })
  const { tick } = useChecklist(campaignId)
  useLayoutEffect(() => {
    const node = stage.current
    if (!node) return
    const observer = new ResizeObserver(() => setSize({ width: node.clientWidth, height: node.clientHeight }))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') useEditor.getState().setPlaying(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => {
    if (devices.size >= 3) tick('devices')
  }, [devices, tick])
  useEffect(() => {
    useEditor.getState().setVisited(path)
  }, [path])
  if (!doc) return null
  const scale = Math.min(1, (size.width - 32) / DEVICE_WIDTH[device], (size.height - 32) / DEVICE_HEIGHT[device])
  const answers = Object.entries(info?.vars ?? {}).filter(([key]) => !SYSTEM.has(key) && !key.startsWith('param.'))
  const matched = info?.matched
  const matchedStep = matched ? stepById(doc, matched.stepId) : undefined
  const matchedRule =
    matchedStep?.kind === 'condition' ? (matchedStep.rules ?? []).find(rule => rule.id === matched?.ruleId) : undefined
  const pick = (value: Breakpoint, label: string, Icon: typeof Smartphone) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={device === value}
      onClick={() => {
        setDevice(value)
        setDevices(current => new Set([...current, value]))
        setRun(r => r + 1)
        setPath([])
      }}
      className={cn(
        'flex h-8 w-9 items-center justify-center rounded',
        device === value ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white',
      )}
    >
      <Icon size={16} />
    </button>
  )
  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-slate-900/95"
      role="dialog"
      aria-modal="true"
      aria-label="Play your journey"
    >
      <div className="flex h-14 shrink-0 items-center gap-3 px-4 text-white">
        <p className="text-sm font-medium">Play{from ? ` from ${stepName(doc, from)}` : ''}</p>
        <div className="ml-4 flex gap-0.5 rounded-md bg-slate-700 p-0.5">
          {pick('mobile', 'Mobile', Smartphone)}
          {pick('tablet', 'Tablet', Tablet)}
          {pick('desktop', 'Desktop', Monitor)}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-slate-200 hover:bg-slate-700"
          onClick={() => {
            setRun(r => r + 1)
            setPath([])
            setInfo(null)
          }}
        >
          <RotateCcw size={14} /> Restart
        </Button>
        <div className="flex-1" />
        <p className="text-xs text-slate-400">Test mode · answers are not saved as leads</p>
        <Button
          size="icon"
          variant="ghost"
          className="text-slate-200 hover:bg-slate-700"
          aria-label="Close"
          onClick={() => useEditor.getState().setPlaying(false)}
        >
          <X size={18} />
        </Button>
      </div>
      <div className="flex min-h-0 flex-1">
        <div ref={stage} className="flex min-w-0 flex-1 items-center justify-center">
          <PlayFrame
            key={`${device}:${run}`}
            doc={doc}
            startAt={from}
            device={device}
            scale={scale}
            title="Journey preview"
            onStep={next => {
              setInfo(next)
              if (next.stepId)
                setPath(current => (current.at(-1) === next.stepId ? current : [...current, next.stepId as string]))
            }}
          />
        </div>
        <aside
          className="w-72 shrink-0 overflow-y-auto border-l border-slate-700 bg-slate-800 p-4 text-sm text-slate-100"
          aria-label="Saved answers"
        >
          <h2 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Now showing</h2>
          <p className="mt-1">
            {info?.status === 'redirect'
              ? 'Redirecting'
              : info?.status === 'ended'
                ? 'Journey finished'
                : info?.stepId
                  ? stepName(doc, info.stepId)
                  : '…'}
          </p>
          {matchedRule && matchedStep ? (
            <p className="mt-3 rounded-md bg-slate-700 p-2 text-xs">
              Took the path “{matchedRule.label}” in {stepName(doc, matchedStep.id)}
            </p>
          ) : null}
          <h2 className="mt-5 text-xs font-semibold tracking-wide text-slate-400 uppercase">Saved answers</h2>
          {answers.length === 0 ? <p className="mt-1 text-xs text-slate-400">Answers appear here as you go.</p> : null}
          <dl className="mt-1 space-y-1.5">
            {answers.map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs text-slate-400">{key}</dt>
                <dd className="break-words">{Array.isArray(value) ? value.join(', ') : String(value)}</dd>
              </div>
            ))}
          </dl>
          {typeof info?.vars.score === 'number' && info.vars.score !== 0 ? (
            <p className="mt-3 text-xs">Score: {info.vars.score}</p>
          ) : null}
          <h2 className="mt-5 text-xs font-semibold tracking-wide text-slate-400 uppercase">Path so far</h2>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs">
            {path.map((id, index) => (
              <li key={`${id}-${index.toString()}`}>{stepName(doc, id)}</li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  )
}
