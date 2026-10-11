import type { Vars } from '@journey/engine/index'
import type { Element, JourneyDoc, Screen } from '@journey/model/types'
import { screenPorts } from '@journey/ports'
import { type CSSProperties, Fragment, type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import { LiveRegion } from '../a11y/LiveRegion'
import { useScreenFocus } from '../a11y/useScreenFocus'
import { cn } from '../classnames'
import type { Breakpoint } from '../constants'
import { validateField } from '../elements/fields'
import { Media } from '../layouts/Media'
import { resolveLayout } from '../responsive/resolve'
import * as s from '../styles/elements.css'
import * as l from '../styles/layout.css'
import { backgroundStyle, compileTheme, resolveColors } from '../theme/compile'
import { useEditBridge } from './EditBridge'
import { ElementView, isVisible } from './ElementView'
import { type CtaEvent, type RenderMode, RuntimeContext, type ScreenRuntime } from './runtime'

export interface SubmitResult {
  ok: boolean
  fields?: Record<string, string>
  message?: string
}

export interface ScreenViewProps {
  doc: JourneyDoc
  screenId: string
  vars: Vars
  breakpoint: Breakpoint
  mode: RenderMode
  isFirst: boolean
  progress?: number | null
  progressLabel?: string | null
  canGoBack?: boolean
  initialAnswers?: Vars
  onBack?: () => void
  onExit: (port: string, answers: Vars) => void
  onSubmit?: (elementId: string, answers: Vars) => Promise<SubmitResult>
  onTrack?: (event: CtaEvent) => void
  onOpenUrl?: (url: string, newTab: boolean, passParams: boolean) => void
  footer?: ReactNode
}

function optionLabels(doc: JourneyDoc): Record<string, string> {
  const labels: Record<string, string> = {}
  for (const screen of Object.values(doc.screens ?? {})) {
    for (const el of screen.elements ?? []) {
      if (el.type === 'choice') for (const option of el.props.options ?? []) labels[option.id] = option.label
    }
  }
  return labels
}

function hasNextProducer(screen: Screen): boolean {
  return (screen.elements ?? []).some(
    el =>
      (el.type === 'buttons' && (el.props.items ?? []).some(item => item.action.kind === 'next')) ||
      (el.type === 'cards' && (el.props.items ?? []).some(item => item.button?.action.kind === 'next')) ||
      (el.type === 'choice' && (el.props.autoAdvance ?? false) && !(el.props.multiple ?? false)) ||
      el.type === 'form',
  )
}

function requiredErrors(elements: Element[], answers: Vars): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const el of elements) {
    if (el.type === 'choice') {
      const value = answers[el.props.key]
      const count = Array.isArray(value) ? value.length : value ? 1 : 0
      if ((el.props.required ?? true) && count === 0) errors[el.props.key] = 'Please choose an option'
      else if (el.props.multiple && el.props.min && count < el.props.min)
        errors[el.props.key] = `Please choose at least ${el.props.min}`
      else if (value === 'other' && el.props.other && !String(answers[`${el.props.key}__other`] ?? '').trim())
        errors[el.props.key] = 'Please tell us more'
    } else if (el.type === 'rating' && (el.props.required ?? true) && typeof answers[el.props.key] !== 'number') {
      errors[el.props.key] = 'Please choose a score'
    }
  }
  return errors
}

function engineAnswers(screen: Screen, answers: Vars): Vars {
  const out: Vars = {}
  for (const el of screen.elements ?? []) {
    if (el.type === 'choice' || el.type === 'rating') {
      if (answers[el.props.key] !== undefined) out[el.props.key] = answers[el.props.key]
      const other = answers[`${el.props.key}__other`]
      if (el.type === 'choice' && other !== undefined) out[`${el.props.key}__other`] = other
    } else if (el.type === 'form') {
      for (const field of el.props.fields ?? [])
        if (answers[field.key] !== undefined) out[field.key] = answers[field.key]
    }
  }
  return out
}

export function ScreenView(props: ScreenViewProps) {
  const { doc, screenId, vars, breakpoint, mode, isFirst } = props
  const screen = doc.screens?.[screenId]
  const ref = useRef<HTMLElement | null>(null)
  const bridge = useEditBridge()
  const [answers, setAnswers] = useState<Vars>(() => ({ ...(props.initialAnswers ?? {}) }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const labels = useMemo(() => optionLabels(doc), [doc])
  const merged = useMemo(() => ({ ...vars, ...answers }), [vars, answers])
  useScreenFocus(ref, screenId, (mode === 'live' || mode === 'test') && !isFirst)

  const { onExit, onSubmit, onTrack, onOpenUrl } = props
  const visibleElements = useCallback(
    (current: Vars) => (screen?.elements ?? []).filter(el => isVisible(el, doc, { ...vars, ...current }, breakpoint)),
    [screen, doc, vars, breakpoint],
  )

  const exitWith = useCallback(
    (port: string, current: Vars, skipValidation: boolean) => {
      if (!screen || mode === 'edit' || mode === 'thumbnail') return
      if (!skipValidation) {
        const found = requiredErrors(visibleElements(current), current)
        if (Object.keys(found).length > 0) {
          setErrors(found)
          setNotice('Please answer the highlighted questions')
          return
        }
      }
      onExit(port, engineAnswers(screen, current))
    },
    [screen, mode, onExit, visibleElements],
  )

  const runtime: ScreenRuntime = {
    mode,
    breakpoint,
    screenId,
    vars: merged,
    answers,
    errors,
    busy,
    isFirst,
    setAnswer: (key, value, options) => {
      const next = { ...answers, [key]: value }
      setAnswers(next)
      if (options?.advance) exitWith('next', next, false)
    },
    clearError: key =>
      setErrors(current => {
        if (!(key in current)) return current
        const { [key]: _removed, ...rest } = current
        return rest
      }),
    exit: (port, options) => exitWith(port, answers, options?.skipValidation ?? false),
    submitForm: elementId => {
      if (!screen || busy || mode === 'edit' || mode === 'thumbnail') return
      const form = (screen.elements ?? []).find(el => el.id === elementId)
      if (form?.type !== 'form') return
      const found: Record<string, string> = { ...requiredErrors(visibleElements(answers), answers) }
      for (const field of form.props.fields ?? []) {
        const problem = validateField(field, answers[field.key])
        if (problem) found[field.key] = problem
      }
      if (Object.keys(found).length > 0) {
        setErrors(found)
        setNotice('Please check the highlighted fields')
        return
      }
      const payload = engineAnswers(screen, answers)
      if (!onSubmit) {
        onExit('next', payload)
        return
      }
      setBusy(true)
      onSubmit(elementId, { ...payload, __hp: answers.__hp })
        .then(result => {
          setBusy(false)
          if (result.ok) onExit('next', payload)
          else {
            setErrors(result.fields ?? {})
            setNotice(result.message ?? 'Please check the highlighted fields')
          }
        })
        .catch(() => {
          setBusy(false)
          setNotice('We could not send your answers. Check your connection and try again.')
        })
    },
    openUrl: (url, newTab, passParams) => {
      if (mode === 'edit' || mode === 'thumbnail') return
      if (onOpenUrl) onOpenUrl(url, newTab, passParams)
      else if (newTab) window.open(url, '_blank', 'noopener')
      else window.location.assign(url)
    },
    track: event => onTrack?.(event),
    notify: message => setNotice(message),
  }

  if (!screen) return null
  const layout = resolveLayout(screen, breakpoint)
  const colors = resolveColors(doc.theme, screen.colorScheme ?? 'theme')
  const scheme: CSSProperties =
    screen.colorScheme === 'inverse' ? (compileTheme(doc.theme, 'inverse') as CSSProperties) : {}
  const elements = screen.elements ?? []
  const needsContinue = screenPorts(screen).length > 0 && !hasNextProducer(screen)
  const sticky = screen.stickyAction ?? false
  const lastAction = [...elements].reverse().find(el => el.type === 'buttons' || el.type === 'form')
  const logo = doc.theme?.logo
  const showBack = (props.canGoBack ?? false) && (screen.allowBack ?? doc.settings?.allowBack ?? false)
  const media = layout.media?.src ? layout.media : undefined
  const mobileMode = media?.onMobile ?? 'top'
  const cover = layout.preset === 'cover' && media
  const background =
    cover || (layout.preset === 'split' && breakpoint === 'mobile' && mobileMode === 'background' && media)

  const content = (
    <div
      className={cn(
        l.content,
        l.width[layout.width],
        l.spacing[layout.spacing],
        l.vAlign[layout.vAlign],
        l.hAlign[layout.hAlign],
      )}
      style={{ flex: '1 1 auto' }}
    >
      {bridge && mode === 'edit' ? bridge.renderInsert(screenId, 0) : null}
      {elements.map((el, index) => {
        const insert = bridge && mode === 'edit' ? bridge.renderInsert(screenId, index + 1) : null
        const view = (
          <ElementView
            key={el.id}
            element={el}
            screenId={screenId}
            doc={doc}
            vars={merged}
            breakpoint={breakpoint}
            mode={mode}
            labels={labels}
          />
        )
        const wrapped =
          sticky && el === lastAction && !needsContinue ? (
            <div key={el.id} className={l.sticky}>
              {view}
            </div>
          ) : (
            view
          )
        return insert ? (
          <Fragment key={el.id}>
            {wrapped}
            {insert}
          </Fragment>
        ) : (
          wrapped
        )
      })}
      {needsContinue ? (
        <div className={sticky ? l.sticky : undefined}>
          <button
            type="button"
            data-jx-tap=""
            disabled={busy}
            className={cn(s.button.primary, s.buttonItem)}
            onClick={() => runtime.exit('next')}
          >
            Continue
          </button>
        </div>
      ) : null}
      {props.footer}
    </div>
  )

  return (
    <RuntimeContext.Provider value={runtime}>
      <section
        ref={ref}
        className={l.screen}
        data-screen-id={screenId}
        aria-label={screen.name}
        style={{ ...scheme, ...backgroundStyle(screen.background, colors), color: colors.text }}
      >
        {logo || showBack || (props.progress ?? null) !== null ? (
          <div>
            {props.progress !== null && props.progress !== undefined ? (
              <div
                className={l.progress}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(props.progress * 100)}
                aria-label={props.progressLabel ?? 'Progress'}
              >
                <div className={l.progressFill} style={{ width: `${Math.round(props.progress * 100)}%` }} />
              </div>
            ) : null}
            {logo || showBack ? (
              <div className={l.chrome}>
                {showBack ? (
                  <button type="button" className={l.back} aria-label="Back" onClick={props.onBack}>
                    ←
                  </button>
                ) : null}
                {logo ? (
                  <span className={l.logoWrap[logo.position ?? 'left']}>
                    <img src={logo.src} alt="Logo" className={l.logo[logo.size ?? 'md']} />
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        {cover ? (
          <div className={cn(l.body, l.cover)}>
            <div className={l.coverMedia}>
              <Media media={cover} eager={isFirst} />
              <div className={l.coverShade} style={{ background: `rgba(0,0,0,${(cover.darken ?? 35) / 100})` }} />
            </div>
            <div className={l.coverContent}>{content}</div>
          </div>
        ) : layout.preset === 'split' && media ? (
          <div className={cn(l.body, l.split)} style={{ position: 'relative' }}>
            {background ? (
              <div className={l.coverMedia} style={{ zIndex: 0 }}>
                <Media media={media} eager={isFirst} />
                <div className={l.coverShade} style={{ background: `rgba(0,0,0,${(media.darken ?? 35) / 100})` }} />
              </div>
            ) : null}
            {breakpoint === 'mobile' && mobileMode === 'top' ? (
              <div className={cn(l.splitPane, l.media)}>
                <Media media={media} eager={isFirst} />
              </div>
            ) : null}
            <div className={l.splitPane} style={background ? { position: 'relative', color: '#ffffff' } : undefined}>
              {content}
            </div>
            {breakpoint !== 'mobile' ? (
              <div className={cn(l.splitPane, l.media)} style={layout.mediaSide === 'left' ? { order: -1 } : undefined}>
                <Media media={media} eager={isFirst} />
              </div>
            ) : null}
          </div>
        ) : (
          <div className={cn(l.body, l.stack)}>{content}</div>
        )}
        <LiveRegion message={notice || props.progressLabel || ''} />
      </section>
    </RuntimeContext.Provider>
  )
}
