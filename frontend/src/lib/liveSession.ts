import { AI_URL } from './api'

export interface StartParams {
  mode: 'live' | 'test'
  campaignId?: string
  journeyId?: string
  devToken?: string
}

export interface LiveChoice {
  handle: string
  label: string
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

export interface LiveNode {
  id: string
  type: string
  config: any
}

export type LiveState =
  | { status: 'connecting' }
  | { status: 'node'; sessionId: string; graphVersion: number; stepIndex: number; node: LiveNode; choices: LiveChoice[] }
  | { status: 'ended'; sessionId: string; reason: string }
  | { status: 'stale'; serverVersion: number }
  | { status: 'error'; code: string; message: string }

export function sessionWsUrl(): string {
  return `${AI_URL.replace(/^http/, 'ws')}/v1/sessions/ws`
}

export class LiveSessionClient {
  private ws: WebSocket | null = null
  private listeners = new Set<(s: LiveState) => void>()
  private params: StartParams | null = null
  private staleTimer: number | null = null
  private queryPending: { resolve: (r: QueryResult) => void; reject: (e: any) => void; timer: number } | null = null
  private pendingGotoNodeId: string | null = null
  private lastNodeId: string | null = null
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

  connect(params: StartParams) {
    this.params = params
    this.closeSocket()
    this.set({ status: 'connecting' })
    const ws = new WebSocket(sessionWsUrl())
    this.ws = ws
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'start', mode: params.mode, campaignId: params.campaignId, journeyId: params.journeyId, devToken: params.devToken }))
    }
    ws.onmessage = ev => {
      let msg: any = null
      try { msg = JSON.parse(ev.data) } catch { return }
      if (!msg || typeof msg !== 'object') return
      if (msg.type === 'node') {
        this.lastNodeId = msg.node?.id || null
        this.set({ status: 'node', sessionId: msg.sessionId, graphVersion: msg.graphVersion, stepIndex: msg.stepIndex, node: msg.node, choices: msg.choices || [] })
        if (this.pendingGotoNodeId && this.params?.mode === 'test' && this.pendingGotoNodeId !== msg.node?.id) {
          const target = this.pendingGotoNodeId
          this.pendingGotoNodeId = null
          this.sendGoto(target)
        } else {
          this.pendingGotoNodeId = null
        }
      } else if (msg.type === 'end') {
        this.set({ status: 'ended', sessionId: msg.sessionId, reason: msg.reason || 'completed' })
      } else if (msg.type === 'graph-stale') {
        this.set({ status: 'stale', serverVersion: msg.serverVersion })
        if (this.staleTimer) window.clearTimeout(this.staleTimer)
        const resumeNodeId = this.params?.mode === 'test' ? this.lastNodeId : null
        this.staleTimer = window.setTimeout(() => {
          if (this.params) {
            this.pendingGotoNodeId = resumeNodeId
            this.connect(this.params)
          }
        }, 800)
      } else if (msg.type === 'query_result') {
        const pending = this.queryPending
        this.queryPending = null
        if (pending) {
          window.clearTimeout(pending.timer)
          pending.resolve({ decision: msg.decision, targetNodeId: msg.targetNodeId, targetNodeType: msg.targetNodeType, targetNodeSummary: msg.targetNodeSummary, targetNodeDetails: msg.targetNodeDetails, answer: msg.answer, citations: msg.citations || [], confidence: msg.confidence, reason: msg.reason })
        }
      } else if (msg.type === 'error') {
        this.set({ status: 'error', code: msg.code || 'error', message: msg.message || 'Something went wrong' })
      }
    }
    ws.onerror = () => {
      this.set({ status: 'error', code: 'unreachable', message: 'Could not reach the experience service' })
    }
    ws.onclose = () => {
      if (this.ws === ws && (this.state.status === 'connecting')) {
        this.set({ status: 'error', code: 'disconnected', message: 'Connection closed' })
      }
    }
  }

  sendChoice(handle?: string, payload?: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'choice', handle, payload }))
    }
  }

  sendGoto(nodeId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'goto', nodeId }))
    }
  }

  sendQuery(query: string, nodeId?: string): Promise<QueryResult> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Session not connected'))
        return
      }
      if (this.queryPending) {
        window.clearTimeout(this.queryPending.timer)
        this.queryPending.reject(new Error('Superseded by newer query'))
      }
      const timer = window.setTimeout(() => {
        if (this.queryPending) {
          this.queryPending = null
          reject(new Error('Query timed out'))
        }
      }, 60000)
      this.queryPending = { resolve, reject, timer }
      this.ws.send(JSON.stringify({ type: 'query', query, nodeId }))
    })
  }

  restart() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'restart' }))
    } else if (this.params) {
      this.connect(this.params)
    }
  }

  private closeSocket() {
    if (this.staleTimer) { window.clearTimeout(this.staleTimer); this.staleTimer = null }
    if (this.ws) { try { this.ws.close() } catch { } this.ws = null }
  }

  close() {
    this.params = null
    this.closeSocket()
  }
}
