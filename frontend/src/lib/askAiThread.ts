import { create } from 'zustand'

export type ChatRole = 'user' | 'assistant'
export type ChatStatus = 'pending' | 'done' | 'error'

export interface ChatMessage {
  id: string
  queryId: string
  role: ChatRole
  text: string
  editedText?: string
  result?: any
  targetNodeId?: string
  screenId?: string
  sessionId: string
  ts: number
  status: ChatStatus
  error?: string
  pinned?: boolean
}

export interface ChatThread {
  key: string
  messages: ChatMessage[]
  unread: number
  open: boolean
  updatedAt: number
}

function storageKey(key: string): string {
  return `journeo.askai.${key}`
}

function loadPersisted(key: string, limit: number): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(storageKey(key))
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.slice(-limit)
  } catch {
    return []
  }
}

let saveTimer: number | null = null
const pendingSaves = new Map<string, ChatMessage[]>()

function scheduleSave(key: string, messages: ChatMessage[], limit: number) {
  const trimmed = messages.slice(-limit).map(m => {
    const c = { ...m }
    if (c.result?.citations && Array.isArray(c.result.citations)) {
      c.result = { ...c.result, citations: c.result.citations.map((x: any) => ({ ...x, snippet: typeof x.snippet === 'string' ? x.snippet.slice(0, 200) : x.snippet })) }
    }
    return c
  })
  pendingSaves.set(key, trimmed)
  if (saveTimer) return
  saveTimer = window.setTimeout(() => {
    saveTimer = null
    for (const [k, msgs] of pendingSaves) {
      try {
        sessionStorage.setItem(storageKey(k), JSON.stringify(msgs))
      } catch { }
    }
    pendingSaves.clear()
  }, 300)
}

interface ThreadState {
  threads: Record<string, ChatThread>
  ensure: (key: string, historyLimit?: number) => ChatThread
  append: (key: string, msg: ChatMessage, historyLimit?: number) => void
  patchMessage: (key: string, id: string, patch: Partial<ChatMessage>, historyLimit?: number) => void
  setOpen: (key: string, open: boolean) => void
  markRead: (key: string) => void
  clear: (key: string) => void
  pruneToScreen: (key: string, screenId: string, historyLimit?: number) => void
  collapseToEphemeral: (key: string, historyLimit?: number) => void
}

export const useAskAiStore = create<ThreadState>((set, get) => ({
  threads: {},
  ensure: (key, historyLimit = 100) => {
    const existing = get().threads[key]
    if (existing) return existing
    const messages = loadPersisted(key, historyLimit)
    const t: ChatThread = { key, messages, unread: 0, open: false, updatedAt: Date.now() }
    set(s => ({ threads: { ...s.threads, [key]: t } }))
    return t
  },
  append: (key, msg, historyLimit = 100) => {
    const cur = get().threads[key] || { key, messages: loadPersisted(key, historyLimit), unread: 0, open: false, updatedAt: 0 }
    const messages = [...cur.messages, msg].slice(-historyLimit)
    set(s => ({ threads: { ...s.threads, [key]: { ...cur, messages, unread: cur.open ? 0 : cur.unread + (msg.role === 'assistant' ? 1 : 0), updatedAt: Date.now() } } }))
    scheduleSave(key, messages, historyLimit)
  },
  patchMessage: (key, id, patch, historyLimit = 100) => {
    const cur = get().threads[key]
    if (!cur) return
    const messages = cur.messages.map(m => (m.id === id ? { ...m, ...patch } : m))
    set(s => ({ threads: { ...s.threads, [key]: { ...cur, messages, updatedAt: Date.now() } } }))
    scheduleSave(key, messages, historyLimit)
  },
  setOpen: (key, open) => {
    const cur = get().threads[key]
    if (!cur) return
    set(s => ({ threads: { ...s.threads, [key]: { ...cur, open, unread: open ? 0 : cur.unread, updatedAt: Date.now() } } }))
  },
  markRead: key => {
    const cur = get().threads[key]
    if (!cur) return
    set(s => ({ threads: { ...s.threads, [key]: { ...cur, unread: 0 } } }))
  },
  clear: key => {
    set(s => ({ threads: { ...s.threads, [key]: { key, messages: [], unread: 0, open: false, updatedAt: Date.now() } } }))
    try {
      sessionStorage.removeItem(storageKey(key))
    } catch { }
  },
  pruneToScreen: (key, screenId, historyLimit = 100) => {
    const cur = get().threads[key]
    if (!cur) return
    const messages = cur.messages.filter(m => !m.screenId || m.screenId === screenId).slice(-historyLimit)
    set(s => ({ threads: { ...s.threads, [key]: { ...cur, messages, updatedAt: Date.now() } } }))
    scheduleSave(key, messages, historyLimit)
  },
  collapseToEphemeral: (key, historyLimit = 100) => {
    const cur = get().threads[key]
    if (!cur) return
    const messages = cur.messages.slice(-2).slice(-historyLimit)
    set(s => ({ threads: { ...s.threads, [key]: { ...cur, messages, updatedAt: Date.now() } } }))
    scheduleSave(key, messages, historyLimit)
  },
}))

export function threadKeyFor(mode: string, campaignId?: string, journeyId?: string): string {
  return `${mode}|${campaignId ?? ''}|${journeyId ?? ''}`
}

export function newMessageId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2)
}
