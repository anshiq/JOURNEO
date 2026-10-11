import { type CtaEvent, ExperienceRoot, ScreenView, type SubmitResult } from '@experience/index'
import { buildIndex } from '@journey/analysis'
import {
  back,
  type EngineEvent,
  type EngineState,
  exit,
  progressFor,
  progressLabel,
  start,
  type Transition,
  type Vars,
} from '@journey/engine/index'
import type { JourneyDoc } from '@journey/model/types'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as api from './api'
import { linkParams, utmOnly, withLinkParams } from './context'
import type { PlayerPayload } from './payload'
import * as ui from './player.css'
import type { EventInput, EventQueue } from './queue'
import { createQueue } from './queue'
import { resumeOrCreate } from './session'

const VisitorChat = lazy(() => import('@experience/chat/VisitorChat'))

export type PlayerMode = 'live' | 'test' | 'embed' | 'fixture'

export interface PlayerProps {
  payload: PlayerPayload
  mode: PlayerMode
  devToken?: string | undefined
  startAt?: string | undefined
  onStep?: StepListener | undefined
}

export type StepListener = (info: {
  stepId: string | null
  vars: Vars
  matched?: { stepId: string; ruleId: string } | undefined
  status: string
}) => void

function initialState(doc: JourneyDoc, system: Vars, startAt?: string): Transition {
  if (startAt && doc.screens?.[startAt]) {
    return {
      state: { stack: [{ stepId: startAt, vars: { ...system, score: 0, outcomes: {} } }], status: 'running' },
      events: [{ type: 'screen_view', step: startAt }],
    }
  }
  return start(doc, { system })
}

function eventInput(event: EngineEvent): EventInput {
  switch (event.type) {
    case 'screen_view':
      return { type: 'screen_view', step: event.step }
    case 'exit':
      return { type: 'exit', step: event.step, port: event.port }
    case 'answer':
      return { type: 'answer', payload: { key: event.key, value: event.value } }
    case 'complete':
      return { type: 'complete', step: event.step }
    case 'engine_error':
      return { type: 'engine_error', payload: { reason: event.reason } }
  }
}

function deviceFor(width: number): 'mobile' | 'tablet' | 'desktop' {
  return width >= 1024 ? 'desktop' : width >= 640 ? 'tablet' : 'mobile'
}

export function Player({ payload, mode, devToken, startAt, onStep }: PlayerProps) {
  const doc = payload.doc
  const params = useMemo(() => linkParams(window.location.search), [])
  const system = useMemo<Vars>(
    () => ({
      ...params,
      device: deviceFor(window.innerWidth),
      locale: navigator.language,
      referrer: document.referrer || '',
      now: new Date().toISOString(),
    }),
    [params],
  )
  const index = useMemo(() => (doc ? buildIndex(doc) : null), [doc])
  const [engine, setEngine] = useState<EngineState | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const session = useRef<{ id: string; queue: EventQueue } | null>(null)
  const network = mode === 'live' || mode === 'test'

  const record = useCallback((events: EventInput[]) => {
    const current = session.current
    if (!current) return
    for (const event of events) current.queue.push(event)
  }, [])

  const apply = useCallback(
    (transition: Transition) => {
      setEngine(transition.state)
      record(transition.events.map(eventInput))
      if (doc && index && (doc.settings?.progress ?? 'bar') === 'bar') {
        setProgress(previous => progressFor(doc, index, transition.state, previous))
      }
      const top = transition.state.stack[transition.state.stack.length - 1]
      onStep?.({
        stepId: top?.stepId ?? null,
        vars: top?.vars ?? {},
        matched: transition.matched,
        status: transition.state.status,
      })
    },
    [doc, index, record, onStep],
  )

  useEffect(() => {
    if (!doc || !payload.campaign) {
      if (doc) apply(initialState(doc, system, startAt))
      return
    }
    let cancelled = false
    const begin = async () => {
      if (network && payload.campaign) {
        const campaignId = payload.campaign.id
        const versionId = mode === 'live' ? (payload.versionId ?? null) : null
        const { id } = resumeOrCreate(campaignId, versionId)
        try {
          await api.startSession({
            id,
            campaignId,
            versionId,
            devToken: mode === 'test' ? (devToken ?? null) : null,
            device: deviceFor(window.innerWidth),
            utm: utmOnly(params),
            referrer: document.referrer || null,
            locale: navigator.language,
          })
          if (!cancelled) {
            session.current = { id, queue: createQueue(id) }
            session.current.queue.push({ type: 'session_start', payload: { device: deviceFor(window.innerWidth) } })
          }
        } catch {
          session.current = null
        }
      }
      if (!cancelled) apply(initialState(doc, system, startAt))
    }
    void begin()
    return () => {
      cancelled = true
      session.current?.queue.dispose()
    }
  }, [doc, payload.campaign, payload.versionId, mode, devToken, network, params, system, startAt, apply])

  useEffect(() => {
    if (engine?.status !== 'redirect' || !engine.redirect) return
    const { url, delayMs } = engine.redirect
    void session.current?.queue.flush()
    if (mode !== 'live') return
    const timer = window.setTimeout(() => window.location.assign(url), delayMs)
    return () => window.clearTimeout(timer)
  }, [engine, mode])

  useEffect(() => {
    if (doc) document.title = payload.doc?.settings?.seo?.title || payload.campaign?.name || document.title
  }, [doc, payload])

  if (!doc) {
    return <EndedCard payload={payload} />
  }
  const top = engine?.stack[engine.stack.length - 1]
  const screenId = top?.stepId ?? null

  const onExit = (port: string, answers: Vars) => {
    if (!engine) return
    apply(exit(doc, engine, port, answers))
  }
  const onSubmit = async (elementId: string, answers: Vars): Promise<SubmitResult> => {
    record([{ type: 'form_submit', step: screenId ?? undefined, element: elementId }])
    const current = session.current
    if (!network || !current || !screenId) return { ok: true }
    const { __hp, ...rest } = answers
    return api.submitLead(current.id, {
      stepId: screenId,
      elementId,
      answers: rest,
      ...(typeof __hp === 'string' && __hp ? { hp: __hp } : {}),
    })
  }
  const onTrack = (event: CtaEvent) =>
    record([
      {
        type: 'cta_click',
        step: screenId ?? undefined,
        element: event.element,
        payload: { item: event.item, kind: event.kind, url: event.url },
      },
    ])
  const onOpenUrl = (url: string, newTab: boolean, passParams: boolean) => {
    const target = passParams ? withLinkParams(url, top?.vars ?? {}) : url
    void session.current?.queue.flush()
    if (mode === 'embed' || mode === 'fixture') {
      setNotice(`Opens ${target}`)
      return
    }
    if (newTab) window.open(target, '_blank', 'noopener')
    else window.location.assign(target)
  }
  const assistant = doc.assistant
  const screen = screenId ? doc.screens?.[screenId] : undefined

  return (
    <ExperienceRoot theme={doc.theme}>
      {bp => (
        <div className={ui.shell}>
          {notice ? (
            <button type="button" className={ui.banner} onClick={() => setNotice(null)}>
              {notice}
            </button>
          ) : null}
          {engine?.status === 'redirect' ? (
            <div className={ui.center}>
              <p>
                {mode === 'live' ? 'Taking you there…' : `Visitors are redirected to ${engine.redirect?.url ?? ''}`}
              </p>
              {mode === 'live' && engine.redirect ? <a href={engine.redirect.url}>Continue</a> : null}
            </div>
          ) : engine?.status === 'ended' || !screenId ? (
            engine ? (
              <div className={ui.center}>
                <p>Thanks for visiting!</p>
              </div>
            ) : null
          ) : (
            <ScreenView
              key={`${screenId}:${engine?.stack.length ?? 0}`}
              doc={doc}
              screenId={screenId}
              vars={top?.vars ?? {}}
              breakpoint={bp}
              mode={mode === 'live' ? 'live' : 'test'}
              isFirst={(engine?.stack.length ?? 0) <= 1}
              progress={progress}
              progressLabel={engine ? progressLabel(doc, engine) : null}
              canGoBack={(engine?.stack.length ?? 0) > 1}
              onBack={() => engine && setEngine(back(engine))}
              onExit={onExit}
              onSubmit={onSubmit}
              onTrack={onTrack}
              onOpenUrl={onOpenUrl}
            />
          )}
          {assistant && screen?.showAssistant && engine?.status === 'running' ? (
            <Suspense fallback={null}>
              <VisitorChat
                config={assistant}
                onAsk={async question => {
                  record([{ type: 'assist_query', step: screenId ?? undefined }])
                  const current = session.current
                  if (!network || !current || !screenId)
                    return { answer: assistant.fallback ?? 'Chat answers appear on the live page.', fallback: true }
                  return api.ask(current.id, question, screenId)
                }}
                onCta={target => {
                  if (!engine || !doc.screens?.[target]) return
                  apply({
                    state: { ...engine, stack: [...engine.stack, { stepId: target, vars: top?.vars ?? {} }] },
                    events: [{ type: 'screen_view', step: target }],
                  })
                }}
              />
            </Suspense>
          ) : null}
        </div>
      )}
    </ExperienceRoot>
  )
}

export function EndedCard({ payload }: { payload: PlayerPayload }) {
  const ended = payload.ended
  useEffect(() => {
    if (ended?.kind === 'redirect' && ended.url && /^https?:\/\//.test(ended.url)) window.location.replace(ended.url)
  }, [ended])
  const message = payload.notFound
    ? 'This link does not exist.'
    : ended?.message || 'This campaign has ended. Thanks for your interest!'
  return (
    <ExperienceRoot theme={undefined}>
      {() => (
        <div className={ui.center}>
          <h1>{payload.campaign?.name ?? 'Journeo'}</h1>
          <p>{message}</p>
        </div>
      )}
    </ExperienceRoot>
  )
}
