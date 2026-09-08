import { renderHook, act, waitFor, cleanup } from '@testing-library/react'
import { vi } from 'vitest'
import { journeyApi } from '../lib/api'
import { useCampaignJourney } from './useCampaignJourney'
import { emptyGraph } from '../lib/journeyGraph'

vi.mock('../lib/api', () => ({
  journeyApi: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}))

const mockedApi = journeyApi as unknown as { get: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> }

beforeEach(() => {
  mockedApi.get.mockReset()
  mockedApi.put.mockReset()
  mockedApi.post.mockReset()
})

afterEach(() => {
  cleanup()
})

test('load on 204 leaves journeyId null with an empty graph', async () => {
  mockedApi.get.mockResolvedValue({ status: 204, data: null })
  const { result } = renderHook(() => useCampaignJourney('c1'))
  await act(async () => { await result.current.load() })
  expect(result.current.status).toBe('loaded')
  expect(result.current.journeyId).toBeNull()
  expect(result.current.graph.nodes).toEqual([])
})

test('a parse error leaves the graph intact and sets status to error', async () => {
  mockedApi.get.mockResolvedValue({ status: 200, data: { id: 'j1', status: 'DRAFT', graphJson: 'not json' } })
  const { result } = renderHook(() => useCampaignJourney('c1'))
  const graphBefore = result.current.graph
  await act(async () => { await result.current.load() })
  expect(result.current.status).toBe('error')
  expect(result.current.graph).toBe(graphBefore)
})

test('save creates once on first save and reuses the same journeyId after', async () => {
  mockedApi.get.mockResolvedValue({ status: 204, data: null })
  mockedApi.put.mockImplementation(async (_url: string, body: any) => ({
    data: { id: 'j1', status: 'DRAFT', graphJson: JSON.stringify(body.graph), version: 1 },
  }))
  const { result } = renderHook(() => useCampaignJourney('c1'))
  await act(async () => { await result.current.load() })
  act(() => {
    result.current.applyGraph({
      ...emptyGraph(),
      nodes: [{ id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, config: {} }],
    })
  })
  await act(async () => { await result.current.save() })
  expect(mockedApi.put).toHaveBeenCalledTimes(1)
  expect(result.current.journeyId).toBe('j1')
  expect(result.current.saveState).toBe('clean')
})

test('concurrent save calls are coalesced into a single extra request', async () => {
  mockedApi.get.mockResolvedValue({ status: 204, data: null })
  let resolvers: Array<() => void> = []
  mockedApi.put.mockImplementation((_url: string, body: any) => new Promise(resolve => {
    resolvers.push(() => resolve({ data: { id: 'j1', status: 'DRAFT', graphJson: JSON.stringify(body.graph), version: 1 } }))
  }))
  const { result } = renderHook(() => useCampaignJourney('c1'))
  await act(async () => { await result.current.load() })
  act(() => {
    result.current.applyGraph({ ...emptyGraph(), nodes: [{ id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, config: {} }] })
  })

  const p1 = result.current.save()
  act(() => {
    result.current.applyGraph({ ...emptyGraph(), nodes: [{ id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, config: {} }, { id: 'n2', type: 'end', position: { x: 10, y: 10 }, config: {} }] })
  })
  const p2 = result.current.save()

  await waitFor(() => expect(resolvers.length).toBe(1))
  await act(async () => { resolvers[0]() })
  await waitFor(() => expect(resolvers.length).toBe(2))
  await act(async () => { resolvers[1]() })
  await Promise.all([p1, p2])

  expect(mockedApi.put).toHaveBeenCalledTimes(2)
})

test('empty-graph guard refuses to persist an empty graph over a saved non-empty journey', async () => {
  mockedApi.get.mockResolvedValue({
    status: 200,
    data: { id: 'j1', status: 'DRAFT', graphJson: JSON.stringify({ schemaVersion: 3, theme: {}, screens: [{ id: 's1', blocks: ['b1'], layout: {}, advance: { mode: 'button', handle: 'default' }, back: { show: false } }], nodes: [{ id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, config: {} }, { id: 'b1', type: 'text', position: { x: 0, y: 0 }, config: { content: 'hello' } }], edges: [] }) },
  })
  const { result } = renderHook(() => useCampaignJourney('c1'))
  await act(async () => { await result.current.load() })

  act(() => { result.current.applyGraph(emptyGraph()) })
  expect(result.current.graph.nodes.length).toBe(0)

  await act(async () => { await result.current.save() })
  expect(mockedApi.put).not.toHaveBeenCalled()
  expect(result.current.saveState).toBe('error')

  mockedApi.put.mockResolvedValue({ data: { id: 'j1', status: 'DRAFT', graphJson: JSON.stringify(emptyGraph()), version: 2 } })
  await act(async () => { await result.current.save({ force: true }) })
  expect(mockedApi.put).toHaveBeenCalledTimes(1)
})
