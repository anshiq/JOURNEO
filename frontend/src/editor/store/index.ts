import type { Breakpoint } from '@experience/constants'
import type { IdGen } from '@journey/ids'
import { randomIds } from '@journey/ids'
import type { JourneyDoc } from '@journey/model/types'
import { invariantProblems, type OpResult, type Selection } from '@journey/ops/index'
import { toast } from 'sonner'
import { create } from 'zustand'
import type { Issue } from '../queries/types'

export type { Selection }

export type SaveStatus = 'clean' | 'dirty' | 'saving' | 'offline' | 'conflict' | 'error'
export type Tab = 'build' | 'design' | 'chat' | 'share' | 'results'
export type CanvasMode = 'screen' | 'flow' | 'all'
export type Panel = 'publish' | 'versions' | 'settings' | 'newScreen' | null

export interface Command {
  label: string
  coalesceKey?: string
  run: (doc: JourneyDoc, ids: IdGen) => OpResult
}

interface Snapshot {
  doc: JourneyDoc
  selection: Selection
  label: string
  coalesceKey?: string | undefined
  at: number
}

export interface Conflict {
  serverRevision: number
  serverDoc: JourneyDoc
  serverHash: string
}

export interface EditorState {
  campaignId: string
  doc: JourneyDoc | null
  selection: Selection
  breakpoint: Breakpoint
  tab: Tab
  canvas: CanvasMode
  playing: boolean
  past: Snapshot[]
  future: Snapshot[]
  revision: number
  hash: string
  liveHash: string | null
  status: SaveStatus
  issues: Issue[]
  issuesRevision: number
  conflict: Conflict | null
  clientIssues: Issue[]
  panel: Panel
  focus: { field: string; nonce: number } | null
  playFrom: string | null
  visited: string[]
  load: (campaignId: string, doc: JourneyDoc, revision: number, hash: string, liveHash: string | null) => void
  dispatch: (command: Command) => void
  undo: () => void
  redo: () => void
  select: (selection: Selection) => void
  setBreakpoint: (bp: Breakpoint) => void
  setTab: (tab: Tab) => void
  setCanvas: (mode: CanvasMode) => void
  setPlaying: (playing: boolean) => void
  replaceDoc: (doc: JourneyDoc, reason: 'conflict' | 'restore' | 'generate', revision?: number, hash?: string) => void
  saved: (revision: number, hash: string, issues: Issue[], sent: JourneyDoc) => void
  setStatus: (status: SaveStatus) => void
  setConflict: (conflict: Conflict | null) => void
  setLiveHash: (hash: string | null) => void
  setIssues: (issues: Issue[]) => void
  setClientIssues: (issues: Issue[]) => void
  setPanel: (panel: Panel) => void
  focusField: (field: string) => void
  play: (from: string | null) => void
  setVisited: (visited: string[]) => void
  keepMine: () => void
}

const LIMIT = 100
const COALESCE_MS = 1000

function sameSelection(a: Selection, b: Selection): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function selectionExists(doc: JourneyDoc, selection: Selection): boolean {
  switch (selection.kind) {
    case 'screen':
      return Boolean(doc.screens?.[selection.screenId])
    case 'element':
    case 'item':
      return Boolean(doc.screens?.[selection.screenId]?.elements?.some(el => el.id === selection.elementId))
    case 'step':
      return (doc.steps ?? []).some(step => step.id === selection.stepId)
    default:
      return true
  }
}

function firstScreen(doc: JourneyDoc): Selection {
  const first = Object.keys(doc.screens ?? {})[0]
  return first ? { kind: 'screen', screenId: first } : { kind: 'none' }
}

export const useEditor = create<EditorState>()((set, get) => ({
  campaignId: '',
  doc: null,
  selection: { kind: 'none' },
  breakpoint: 'mobile',
  tab: 'build',
  canvas: 'screen',
  playing: false,
  past: [],
  future: [],
  revision: 0,
  hash: '',
  liveHash: null,
  status: 'clean',
  issues: [],
  issuesRevision: 0,
  conflict: null,
  clientIssues: [],
  panel: null,
  focus: null,
  playFrom: null,
  visited: [],
  load: (campaignId, doc, revision, hash, liveHash) =>
    set({
      campaignId,
      doc,
      revision,
      hash,
      liveHash,
      selection: firstScreen(doc),
      past: [],
      future: [],
      status: 'clean',
      conflict: null,
      issues: [],
      tab: 'build',
      canvas: 'screen',
    }),
  dispatch: command => {
    const state = get()
    if (!state.doc) return
    const outcome = command.run(state.doc, randomIds)
    if (outcome.doc === state.doc) {
      if (outcome.effects.select) set({ selection: outcome.effects.select })
      return
    }
    if (import.meta.env.DEV) {
      const problems = invariantProblems(outcome.doc)
      if (problems.length) {
        console.error('rejected command', command.label, problems)
        return
      }
    }
    const now = performance.now()
    const top = state.past.at(-1)
    const coalesce =
      command.coalesceKey !== undefined &&
      top?.coalesceKey === command.coalesceKey &&
      now - top.at < COALESCE_MS &&
      sameSelection(top.selection, state.selection)
    const past =
      coalesce && top
        ? [...state.past.slice(0, -1), { ...top, at: now }]
        : [
            ...state.past,
            {
              doc: state.doc,
              selection: state.selection,
              label: command.label,
              coalesceKey: command.coalesceKey,
              at: now,
            },
          ].slice(-LIMIT)
    const selection = outcome.effects.select ?? state.selection
    set({
      doc: outcome.doc,
      selection: selectionExists(outcome.doc, selection) ? selection : firstScreen(outcome.doc),
      past,
      future: [],
      status: state.status === 'conflict' ? 'conflict' : 'dirty',
    })
    if (outcome.effects.toast) {
      toast(outcome.effects.toast, { action: { label: 'Undo', onClick: () => get().undo() } })
    }
  },
  undo: () => {
    const state = get()
    const previous = state.past.at(-1)
    if (!previous || !state.doc) return
    set({
      doc: previous.doc,
      selection: selectionExists(previous.doc, previous.selection) ? previous.selection : firstScreen(previous.doc),
      past: state.past.slice(0, -1),
      future: [
        ...state.future,
        { doc: state.doc, selection: state.selection, label: previous.label, at: performance.now() },
      ],
      status: 'dirty',
    })
  },
  redo: () => {
    const state = get()
    const next = state.future.at(-1)
    if (!next || !state.doc) return
    set({
      doc: next.doc,
      selection: selectionExists(next.doc, next.selection) ? next.selection : firstScreen(next.doc),
      future: state.future.slice(0, -1),
      past: [...state.past, { doc: state.doc, selection: state.selection, label: next.label, at: performance.now() }],
      status: 'dirty',
    })
  },
  select: selection => set({ selection }),
  setBreakpoint: breakpoint => set({ breakpoint }),
  setTab: tab => set({ tab }),
  setCanvas: canvas => set({ canvas }),
  setPlaying: playing => set({ playing }),
  replaceDoc: (doc, reason, revision, hash) => {
    const state = get()
    if (reason === 'conflict') {
      set({
        doc,
        past: [],
        future: [],
        revision: revision ?? state.revision,
        hash: hash ?? state.hash,
        status: 'clean',
        conflict: null,
        selection: state.doc && selectionExists(doc, state.selection) ? state.selection : firstScreen(doc),
      })
      return
    }
    set({
      doc,
      past: state.doc
        ? [...state.past, { doc: state.doc, selection: state.selection, label: reason, at: performance.now() }].slice(
            -LIMIT,
          )
        : [],
      future: [],
      revision: revision ?? state.revision,
      hash: hash ?? state.hash,
      status: reason === 'restore' || reason === 'generate' ? 'clean' : 'dirty',
      selection: selectionExists(doc, state.selection) ? state.selection : firstScreen(doc),
    })
  },
  saved: (revision, hash, issues, sent) => {
    const state = get()
    set({ revision, hash, issues, issuesRevision: revision, status: state.doc === sent ? 'clean' : 'dirty' })
  },
  setStatus: status => set({ status }),
  setConflict: conflict => set({ conflict, status: conflict ? 'conflict' : get().status }),
  setLiveHash: liveHash => set({ liveHash }),
  setIssues: issues => set({ issues }),
  setClientIssues: clientIssues => set({ clientIssues }),
  setPanel: panel => set({ panel }),
  focusField: field => set({ focus: { field, nonce: (get().focus?.nonce ?? 0) + 1 } }),
  play: from => set({ playing: true, playFrom: from, visited: [] }),
  setVisited: visited => set({ visited }),
  keepMine: () => {
    const conflict = get().conflict
    if (!conflict) return
    set({ revision: conflict.serverRevision, conflict: null, status: 'dirty' })
  },
}))

export function useDoc(): JourneyDoc {
  const doc = useEditor(state => state.doc)
  if (!doc) throw new Error('No document loaded')
  return doc
}
