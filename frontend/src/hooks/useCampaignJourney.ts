import { useCallback, useRef, useState } from 'react'
import { journeyApi } from '../lib/api'
import {
  emptyGraph,
  parseGraph,
  serializeGraph,
  hasContent,
  patchNode,
  GraphParseError,
  type JourneyGraph,
  type NodePatch,
} from '../lib/journeyGraph'

export type JourneyLoadStatus = 'idle' | 'loading' | 'loaded' | 'error'
export type JourneySaveState = 'clean' | 'dirty' | 'saving' | 'error'
export type JourneyPublishStatus = 'DRAFT' | 'PUBLISHED' | null
export type PublishResult = { ok: true } | { ok: false; errors: any[] }

export interface UseCampaignJourney {
  status: JourneyLoadStatus
  journeyId: string | null
  journeyStatus: JourneyPublishStatus
  graph: JourneyGraph
  saveState: JourneySaveState
  error: string | null
  load: () => Promise<void>
  applyGraph: (next: JourneyGraph) => boolean
  applyNodePatch: (nodeId: string, patch: NodePatch) => void
  save: (opts?: { force?: boolean }) => Promise<void>
  publish: () => Promise<PublishResult>
}

export function useCampaignJourney(campaignId: string | null | undefined): UseCampaignJourney {
  const [status, setStatus] = useState<JourneyLoadStatus>('idle')
  const [journeyId, setJourneyId] = useState<string | null>(null)
  const [journeyStatus, setJourneyStatus] = useState<JourneyPublishStatus>(null)
  const [graph, setGraph] = useState<JourneyGraph>(emptyGraph())
  const [saveState, setSaveState] = useState<JourneySaveState>('clean')
  const [error, setError] = useState<string | null>(null)

  const campaignIdRef = useRef(campaignId)
  campaignIdRef.current = campaignId
  const statusRef = useRef(status)
  statusRef.current = status
  const graphRef = useRef(graph)
  graphRef.current = graph
  const revisionRef = useRef(0)
  const inFlightRef = useRef<Promise<void> | null>(null)
  const pendingRef = useRef(false)
  const pendingForceRef = useRef(false)
  const lastPersistedHadContentRef = useRef(false)

  const load = useCallback(async () => {
    const cid = campaignIdRef.current
    if (!cid) return
    setStatus('loading')
    setError(null)
    try {
      const res = await journeyApi.get(`/api/campaigns/${cid}/journey`)
      if (res.status === 204 || !res.data) {
        setJourneyId(null)
        setJourneyStatus(null)
        setGraph(emptyGraph())
        lastPersistedHadContentRef.current = false
        setStatus('loaded')
        return
      }
      const g = parseGraph(res.data.graphJson)
      setJourneyId(res.data.id)
      setJourneyStatus(res.data.status || 'DRAFT')
      setGraph(g)
      lastPersistedHadContentRef.current = hasContent(g)
      setStatus('loaded')
    } catch (e: any) {
      setError(e instanceof GraphParseError ? e.message : (e?.message || 'failed to load journey'))
      setStatus('error')
    }
  }, [])

  const applyGraph = useCallback((next: JourneyGraph): boolean => {
    if (statusRef.current !== 'loaded') return false
    setGraph(next)
    setSaveState('dirty')
    return true
  }, [])

  const applyNodePatch = useCallback((nodeId: string, patch: NodePatch) => {
    if (statusRef.current !== 'loaded') return
    setGraph(prev => patchNode(prev, nodeId, patch))
    setSaveState('dirty')
  }, [])

  const runSave = useCallback(async (force: boolean) => {
    const cid = campaignIdRef.current
    if (!cid) return
    const graphToSave = graphRef.current
    if (!hasContent(graphToSave) && lastPersistedHadContentRef.current && !force) {
      setSaveState('error')
      setError('refusing to overwrite a saved journey with an empty graph')
      return
    }
    const myRevision = ++revisionRef.current
    setSaveState('saving')
    try {
      const res = await journeyApi.put(`/api/campaigns/${cid}/journey`, { graph: JSON.parse(serializeGraph(graphToSave)) })
      if (revisionRef.current !== myRevision) return
      setJourneyId(res.data.id)
      setJourneyStatus(res.data.status || 'DRAFT')
      lastPersistedHadContentRef.current = hasContent(graphToSave)
      setError(null)
      setSaveState(pendingRef.current ? 'dirty' : 'clean')
    } catch (e: any) {
      if (revisionRef.current !== myRevision) return
      setSaveState('error')
      setError(e?.response?.data?.error || e?.message || 'failed to save journey')
    }
  }, [])

  const save = useCallback(async (opts?: { force?: boolean }) => {
    if (statusRef.current !== 'loaded') return
    if (opts?.force) pendingForceRef.current = true
    if (inFlightRef.current) {
      pendingRef.current = true
      await inFlightRef.current
      return
    }
    pendingRef.current = false
    const run = async () => {
      let force = pendingForceRef.current
      pendingForceRef.current = false
      await runSave(force)
      while (pendingRef.current) {
        pendingRef.current = false
        force = pendingForceRef.current
        pendingForceRef.current = false
        await runSave(force)
      }
    }
    const p = run().finally(() => { inFlightRef.current = null })
    inFlightRef.current = p
    await p
  }, [runSave])

  const publish = useCallback(async (): Promise<PublishResult> => {
    await save()
    const cid = campaignIdRef.current
    if (!cid) return { ok: false, errors: [{ message: 'missing campaign' }] }
    try {
      const res = await journeyApi.post(`/api/campaigns/${cid}/journey/publish`)
      setJourneyStatus(res.data.status || 'PUBLISHED')
      return { ok: true }
    } catch (e: any) {
      const errors = e?.response?.data?.errors || [{ message: e?.message || 'publish failed' }]
      return { ok: false, errors }
    }
  }, [save])

  return { status, journeyId, journeyStatus, graph, saveState, error, load, applyGraph, applyNodePatch, save, publish }
}
