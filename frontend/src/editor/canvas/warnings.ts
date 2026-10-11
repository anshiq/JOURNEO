import type { Breakpoint } from '@experience/index'
import type { JourneyDoc } from '@journey/model/types'
import { useEffect, useRef } from 'react'
import type { Issue } from '../queries/types'
import { useEditor } from '../store'
import { DEVICE_HEIGHT } from './DeviceFrame'

export function docWarnings(doc: JourneyDoc): Issue[] {
  const out: Issue[] = []
  for (const screen of Object.values(doc.screens ?? {})) {
    for (const el of screen.elements ?? []) {
      if (el.type === 'choice' && el.props.display === 'pictures' && (el.props.options ?? []).length > 8) {
        out.push({
          code: 'W_TOO_MANY_OPTIONS',
          severity: 'warning',
          message: 'More than 8 picture choices is hard to scan on a phone',
          target: { kind: 'element', id: el.id, screenId: screen.id, field: 'options' },
          client: true,
        })
      }
    }
    const media = screen.layout?.media
    const hasText = (screen.elements ?? []).some(el => el.type === 'heading' || el.type === 'text')
    if (screen.layout?.preset === 'cover' && media?.src && hasText && (media.darken ?? 40) < 30) {
      out.push({
        code: 'W_TEXT_ON_IMAGE',
        severity: 'warning',
        message: 'Text over this photo may be hard to read. Raise the darken setting.',
        target: { kind: 'screen', id: screen.id, screenId: screen.id, field: 'darken' },
        fix: { kind: 'raise_darken' },
        client: true,
      })
    }
  }
  return out
}

function measured(root: HTMLElement, screenId: string): Issue[] {
  const out: Issue[] = []
  for (const node of root.querySelectorAll<HTMLElement>('[data-element-type="heading"]')) {
    const heading = node.querySelector<HTMLElement>('h1,h2,h3')
    if (!heading) continue
    const lineHeight = Number.parseFloat(getComputedStyle(heading).lineHeight) || 1
    if (heading.offsetHeight / lineHeight > 4.5) {
      out.push({
        code: 'W_LONG_HEADLINE',
        severity: 'warning',
        message: 'This headline takes more than 4 lines on a phone. Try a shorter one.',
        target: { kind: 'element', id: node.dataset.elementId ?? '', screenId, field: 'text' },
        client: true,
      })
    }
  }
  const content = root.querySelector<HTMLElement>('[data-device] > div')
  if (content && content.offsetHeight > DEVICE_HEIGHT.mobile * 2.5) {
    out.push({
      code: 'W_LONG_SCREEN',
      severity: 'warning',
      message: 'This screen is very long on a phone. Split it into two screens.',
      target: { kind: 'screen', id: screenId, screenId },
      client: true,
    })
  }
  return out
}

export function useResponsiveWarnings(screenId: string | null, breakpoint: Breakpoint) {
  const ref = useRef<HTMLDivElement | null>(null)
  const doc = useEditor(state => state.doc)
  const perScreen = useRef<Record<string, Issue[]>>({})
  useEffect(() => {
    if (!doc) return
    const frame = window.requestAnimationFrame(() => {
      if (screenId && breakpoint === 'mobile' && ref.current)
        perScreen.current[screenId] = measured(ref.current, screenId)
      for (const id of Object.keys(perScreen.current)) if (!doc.screens?.[id]) delete perScreen.current[id]
      const issues = [...docWarnings(doc), ...Object.values(perScreen.current).flat()]
      const previous = useEditor.getState().clientIssues
      if (JSON.stringify(previous) !== JSON.stringify(issues)) useEditor.getState().setClientIssues(issues)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [doc, screenId, breakpoint])
  return ref
}
