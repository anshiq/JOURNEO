import { AI_URL } from './api'

export interface StartParams {
  mode: 'live' | 'test'
  campaignId?: string
  journeyId?: string
  devToken?: string
  resumeThread?: boolean
}

export interface LiveChoice {
  handle: string
  label: string
  source: 'advance' | 'block' | 'timeout'
  blockId?: string
}

export interface QueryCitation {
  chunk_id?: number
  snippet?: string
  similarity?: number
}

export interface QueryNodeFact {
  label: string
  value: string
}

export interface QueryNodeDetails {
  nodeId?: string
  nodeType?: string
  title?: string
  subtitle?: string
  facts?: QueryNodeFact[]
}

export interface QueryResult {
  queryId?: string
  decision: 'jump' | 'rag' | 'reject'
  targetNodeId?: string | null
  targetNodeType?: string | null
  targetNodeSummary?: string | null
  targetNodeDetails?: QueryNodeDetails | null
  answer?: string | null
  citations?: QueryCitation[]
  confidence?: number
  reason?: string
}

export interface LiveBlock {
  nodeId: string
  type: string
  config: any
}

export interface LiveScreenMeta {
  id: string
  name: string
  layout: any
  theme: any
  style?: any
  advance: any
  back: any
}

export type LiveState =
  | { status: 'connecting' }
  | { status: 'screen'; sessionId: string; graphVersion: number; stepIndex: number; screen: LiveScreenMeta; blocks: LiveBlock[]; choices: LiveChoice[]; timeoutMs: number | null }
  | { status: 'ended'; sessionId: string; reason: string }
  | { status: 'stale'; serverVersion: number }
  | { status: 'error'; code: string; message: string }

export function sessionWsUrl(): string {
  return `${AI_URL.replace(/^http/, 'ws')}/v1/sessions/ws`
}

interface PendingQuery { resolve: (r: QueryResult) => void; reject: (e: any) => void; timer: number }

export class LiveSessionClient {
  private ws: WebSocket | null = null
  private listeners = new Set<(s: LiveState) => void>()
  private params: StartParams | null = null
  private staleTimer: number | null = null
  private timeoutTimer: number | null = null
  private timeoutKey: string | null = null
  private queryPending = new Map<string, PendingQuery>()
  private queryQueue: (() => void)[] = []
  private maxConcurrent = 3
  private pendingResume: { screenId: string } | null = null
  private lastScreenId: string | null = null
  private lastStepIndex: number | null = null
  state: LiveState = { status: 'connecting' }

  subscribe(fn: (s: LiveState) => void): () => void {
    this.listeners.add(fn)
    fn(this.state)
    return () => { this.listeners.delete(fn) }
  }

  private set(state: LiveState) {
    this.state = state
    this.listeners.forEach(fn => fn(state))
  }

  private clearTimeoutTimer() {
    if (this.timeoutTimer) window.clearTimeout(this.timeoutTimer)
    this.timeoutTimer = null
    this.timeoutKey = null
  }

  private armTimeoutTimer(sessionId: string, stepIndex: number, screenId: string | undefined, timeoutMs: number | null, choiceCount: number) {
    this.clearTimeoutTimer()
    if (!timeoutMs || timeoutMs <= 0 || choiceCount > 1) return
    const key = `${sessionId}|${stepIndex}|${screenId || ''}`
    this.timeoutKey = key
    this.timeoutTimer = window.setTimeout(() => {
      if (this.timeoutKey === key) this.sendTimeout()
    }, timeoutMs)
  }

  connect(params: StartParams) {
    this.params = params
    this.closeSocket()
    this.set({ status: 'connecting' })
    const ws = new WebSocket(sessionWsUrl())
    this.ws = ws
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'start', mode: params.mode, campaignId: params.campaignId, journeyId: params.journeyId, devToken: params.devToken, resumeThread: params.resumeThread }))
    }
    ws.onmessage = ev => {
      let msg: any = null
      try { msg = JSON.parse(ev.data) } catch { return }
      if (!msg || typeof msg !== 'object') return
      if (msg.type === 'screen') {
        this.lastScreenId = msg.screen?.id || null
        this.lastStepIndex = typeof msg.stepIndex === 'number' ? msg.stepIndex : null
        const timeoutMs = typeof msg.timeoutMs === 'number' && msg.timeoutMs > 0 ? msg.timeoutMs : null
        this.set({ status: 'screen', sessionId: msg.sessionId, graphVersion: msg.graphVersion, stepIndex: msg.stepIndex, screen: msg.screen, blocks: msg.blocks || [], choices: msg.choices || [], timeoutMs })
        this.armTimeoutTimer(msg.sessionId, msg.stepIndex, msg.screen?.id, timeoutMs, (msg.choices || []).length)
        if (this.pendingResume && this.params?.mode === 'test' && this.pendingResume.screenId !== msg.screen?.id) {
          const target = this.pendingResume.screenId
          this.pendingResume = null
          this.sendGoto({ screenId: target })
        } else {
          this.pendingResume = null
        }
      } else if (msg.type === 'end') {
        this.clearTimeoutTimer()
        this.set({ status: 'ended', sessionId: msg.sessionId, reason: msg.reason || 'completed' })
      } else if (msg.type === 'graph-stale') {
        this.clearTimeoutTimer()
        this.set({ status: 'stale', serverVersion: msg.serverVersion })
        if (this.staleTimer) window.clearTimeout(this.staleTimer)
        const resumeScreenId = this.params?.mode === 'test' ? this.lastScreenId : null
        this.staleTimer = window.setTimeout(() => {
          if (this.params) {
            this.pendingResume = resumeScreenId ? { screenId: resumeScreenId } : null
            this.connect(this.params)
          }
        }, 800)
      } else if (msg.type === 'query_result') {
        const qid = typeof msg.queryId === 'string' ? msg.queryId : null
        const done = (key: string) => {
          const pending = this.queryPending.get(key)
          if (!pending) return false
          this.queryPending.delete(key)
          window.clearTimeout(pending.timer)
          pending.resolve({ queryId: qid || key, decision: msg.decision, targetNodeId: msg.targetNodeId, targetNodeType: msg.targetNodeType, targetNodeSummary: msg.targetNodeSummary, targetNodeDetails: msg.targetNodeDetails, answer: msg.answer, citations: msg.citations || [], confidence: msg.confidence, reason: msg.reason })
          this.pumpQueue()
          return true
        }
        if (qid) {
          if (!done(qid)) {
            const first = [...this.queryPending.keys()][0]
            if (first) done(first)
          }
        } else {
          const first = [...this.queryPending.keys()][0]
          if (first) done(first)
        }
      } else if (msg.type === 'chat_history') {
        window.dispatchEvent(new CustomEvent('askai:history', { detail: msg.messages || [] }))
      } else if (msg.type === 'error') {
        this.clearTimeoutTimer()
        if (msg.code === 'goto-forbidden' || msg.code === 'unreachable-node' || msg.code === 'bad-goto') return
        this.set({ status: 'error', code: msg.code || 'error', message: msg.message || 'Something went wrong' })
        for (const [, p] of this.queryPending) {
          window.clearTimeout(p.timer)
          p.reject(new Error(msg.message || 'Query failed'))
        }
        this.queryPending.clear()
        this.queryQueue = []
      }
    }
    ws.onerror = () => {
      this.set({ status: 'error', code: 'unreachable', message: 'Could not reach the experience service' })
    }
    ws.onclose = () => {
      if (this.ws === ws && (this.state.status === 'connecting')) {
        this.set({ status: 'error', code: 'disconnected', message: 'Connection closed' })
      }
      if (this.ws === ws) {
        for (const [, p] of this.queryPending) {
          window.clearTimeout(p.timer)
          p.reject(new Error('Connection closed'))
        }
        this.queryPending.clear()
        this.queryQueue = []
      }
    }
  }

  private pumpQueue() {
    while (this.queryPending.size < this.maxConcurrent && this.queryQueue.length > 0) {
      const fn = this.queryQueue.shift()
      if (fn) fn()
    }
  }

  sendChoice(handle?: string, payload?: any) {
    this.clearTimeoutTimer()
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'choice', handle, payload }))
    }
  }

  sendTimeout() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'timeout', stepIndex: this.lastStepIndex, screenId: this.lastScreenId }))
    }
  }

  sendBack() {
    this.clearTimeoutTimer()
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'back' }))
    }
  }

  sendGoto(target: string | { screenId?: string; nodeId?: string }) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (typeof target === 'string') this.ws.send(JSON.stringify({ type: 'goto', screenId: target }))
      else this.ws.send(JSON.stringify({ type: 'goto', ...target }))
    }
  }

  sendQuery(query: string, opts?: { queryId?: string; screenId?: string; blockId?: string; timeoutMs?: number }): { queryId: string; promise: Promise<QueryResult> } {
    const queryId = opts?.queryId || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2))
    const promise = new Promise<QueryResult>((resolve, reject) => {
      const attempt = () => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          reject(new Error('Session not connected'))
          this.pumpQueue()
          return
        }
        const timer = window.setTimeout(() => {
          if (this.queryPending.has(queryId)) {
            this.queryPending.delete(queryId)
            reject(new Error('Query timed out'))
            this.pumpQueue()
          }
        }, opts?.timeoutMs || 60000)
        this.queryPending.set(queryId, { resolve, reject, timer })
        this.ws!.send(JSON.stringify({ type: 'query', queryId, query, screenId: opts?.screenId, blockId: opts?.blockId }))
      }
      if (this.queryPending.size >= this.maxConcurrent) this.queryQueue.push(attempt)
      else attempt()
    })
    return { queryId, promise }
  }

  setMaxConcurrentQueries(limit: number) {
    this.maxConcurrent = Math.max(1, Math.floor(limit || 1))
    this.pumpQueue()
  }

  queryQueueDepth(): number {
    return this.queryQueue.length
  }

  pendingQueryCount(): number {
    return this.queryPending.size
  }

  restart() {
    this.clearTimeoutTimer()
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'restart' }))
    } else if (this.params) {
      this.connect(this.params)
    }
  }

  private rejectPendingQueries(error: Error) {
    for (const [, pending] of this.queryPending) {
      window.clearTimeout(pending.timer)
      pending.reject(error)
    }
    this.queryPending.clear()
    this.queryQueue = []
  }

  private closeSocket() {
    this.clearTimeoutTimer()
    if (this.staleTimer) { window.clearTimeout(this.staleTimer); this.staleTimer = null }
    if (this.ws) { try { this.ws.close() } catch { } this.ws = null }
    this.rejectPendingQueries(new Error('Connection closed'))
  }

  close() {
    this.params = null
    this.closeSocket()
  }
}
