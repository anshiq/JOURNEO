import { produce } from 'immer'
import type { JourneyDoc, Theme } from '../model/types'
import { clone, type OpResult, type Path, result, setIn } from './core'

export function setTheme(path: Path, value: unknown) {
  return (doc: JourneyDoc): OpResult =>
    result(
      produce(doc, draft => {
        draft.theme ??= {}
        setIn(draft.theme as unknown as Record<string, unknown>, path, value)
      }),
    )
}

export function applyPreset(theme: Theme, resetCustom: boolean) {
  return (doc: JourneyDoc): OpResult =>
    result(
      produce(doc, draft => {
        const keep = { logo: draft.theme?.logo, voice: draft.theme?.voice }
        draft.theme = {
          ...clone(theme),
          ...(keep.logo ? { logo: keep.logo } : {}),
          ...(keep.voice ? { voice: keep.voice } : {}),
        }
        if (!resetCustom) return
        for (const screen of Object.values(draft.screens ?? {})) {
          delete (screen as Record<string, unknown>).background
          for (const el of screen.elements ?? []) {
            const style = (el as { style?: Record<string, unknown> }).style
            if (style) delete style.colorRole
          }
        }
      }),
    )
}

export function customColorCount(doc: JourneyDoc): number {
  let count = 0
  for (const screen of Object.values(doc.screens ?? {})) {
    if (screen.background) count += 1
    for (const el of screen.elements ?? []) if (el.style?.colorRole) count += 1
  }
  return count
}

export function setSettings(path: Path, value: unknown) {
  return (doc: JourneyDoc): OpResult =>
    result(
      produce(doc, draft => {
        draft.settings ??= {}
        setIn(draft.settings as unknown as Record<string, unknown>, path, value)
      }),
    )
}

export function setAssistant(path: Path | null, value: unknown) {
  return (doc: JourneyDoc): OpResult =>
    result(
      produce(doc, draft => {
        if (path === null) {
          draft.assistant = value as never
          return
        }
        draft.assistant ??= {}
        setIn(draft.assistant as unknown as Record<string, unknown>, path, value)
      }),
    )
}
