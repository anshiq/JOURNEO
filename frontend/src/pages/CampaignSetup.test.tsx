import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import CampaignSetup from './CampaignSetup'
import { journeyApi } from '../lib/api'

vi.mock('../lib/api', () => ({
  journeyApi: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
  aiApi: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}))

vi.mock('../components/preview/LiveAdStage', () => ({ default: () => null }))
vi.mock('../components/preview/FloatingDevicePreview', () => ({ default: () => null }))

class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver || FakeResizeObserver

const mockedApi = journeyApi as unknown as { get: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> }

function createFakeBackend(campaignId: string) {
  const campaign: any = { id: campaignId, name: 'Test Campaign', description: '', objective: '', audience: '', devToken: 'dev-token-123', status: 'ACTIVE' }
  let journey: any = null
  let idCounter = 0
  let putCount = 0

  const get = vi.fn(async (url: string) => {
    if (/^\/api\/campaigns\/[^/]+\/journey$/.test(url)) {
      if (!journey) return { status: 204, data: null }
      return { status: 200, data: journey }
    }
    if (/^\/api\/campaigns\/[^/]+$/.test(url)) {
      return { status: 200, data: campaign }
    }
    throw new Error('unhandled GET ' + url)
  })

  const put = vi.fn(async (url: string, body: any) => {
    if (/^\/api\/campaigns\/[^/]+\/journey$/.test(url)) {
      putCount += 1
      const graphJson = JSON.stringify(body.graph)
      if (!journey) {
        idCounter += 1
        journey = { id: `journey-${idCounter}`, campaignId, name: 'Journey', graphJson, status: 'DRAFT', version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      } else {
        journey = { ...journey, graphJson, version: journey.version + 1, updatedAt: new Date().toISOString() }
      }
      return { status: 200, data: journey }
    }
    if (/^\/api\/campaigns\/[^/]+$/.test(url)) {
      Object.assign(campaign, body)
      return { status: 200, data: campaign }
    }
    throw new Error('unhandled PUT ' + url)
  })

  const post = vi.fn(async (url: string) => {
    throw new Error('unhandled POST ' + url)
  })

  return {
    get, put, post,
    getJourney: () => journey,
    getJourneyRowCount: () => (journey ? 1 : 0),
    getJourneyCreateCount: () => idCounter,
    getPutCount: () => putCount,
  }
}

let backend: ReturnType<typeof createFakeBackend>

beforeEach(() => {
  backend = createFakeBackend('camp1')
  mockedApi.get.mockReset()
  mockedApi.put.mockReset()
  mockedApi.post.mockReset()
  mockedApi.get.mockImplementation(backend.get)
  mockedApi.put.mockImplementation(backend.put)
  mockedApi.post.mockImplementation(backend.post)
})

afterEach(() => {
  cleanup()
})

function renderSetup() {
  return render(
    <MemoryRouter initialEntries={['/campaigns/camp1/setup?step=1']}>
      <Routes>
        <Route path="/campaigns/:id/setup" element={<CampaignSetup />} />
      </Routes>
    </MemoryRouter>,
  )
}

test('building a journey then styling a node in Experience never duplicates the journey row and never drops nodes', async () => {
  renderSetup()

  const saveAndContinue = await screen.findByRole('button', { name: /Save and continue/i })
  await waitFor(() => expect((saveAndContinue as HTMLButtonElement).disabled).toBe(false))

  fireEvent.doubleClick(screen.getByText('trigger'))
  fireEvent.doubleClick(screen.getByText('text'))

  fireEvent.click(saveAndContinue)

  await waitFor(() => expect(mockedApi.put).toHaveBeenCalledTimes(1))
  expect(backend.getJourneyRowCount()).toBe(1)
  expect(backend.getJourneyCreateCount()).toBe(1)

  const graphAfterFirstSave = JSON.parse(backend.getJourney().graphJson)
  expect(graphAfterFirstSave.nodes).toHaveLength(2)

  const activeNodeSelect = (await screen.findByLabelText('Active node')) as HTMLSelectElement
  const textOption = within(activeNodeSelect).getAllByRole('option').find(o => o.textContent?.startsWith('text')) as HTMLOptionElement
  expect(textOption).toBeTruthy()
  fireEvent.change(activeNodeSelect, { target: { value: textOption.value } })

  const fontSizeInput = (await screen.findByPlaceholderText('14px')) as HTMLInputElement
  fireEvent.change(fontSizeInput, { target: { value: '22px' } })

  await waitFor(() => expect(mockedApi.put).toHaveBeenCalledTimes(2), { timeout: 3000 })
  expect(backend.getJourneyRowCount()).toBe(1)
  expect(backend.getJourneyCreateCount()).toBe(1)

  const finalGraph = JSON.parse(backend.getJourney().graphJson)
  expect(finalGraph.nodes).toHaveLength(2)
  const styledNode = finalGraph.nodes.find((n: any) => n.type === 'text')
  expect(styledNode.config.style.fontSize).toBe('22px')
  const triggerNode = finalGraph.nodes.find((n: any) => n.type === 'trigger')
  expect(triggerNode).toBeTruthy()
})

test('repeated manual saves never create a second journey row', async () => {
  renderSetup()

  const saveJourneyButtons = await screen.findAllByRole('button', { name: /^Save journey$/i })
  const saveJourneyButton = saveJourneyButtons[0] as HTMLButtonElement
  await waitFor(() => expect(saveJourneyButton.disabled).toBe(false))

  fireEvent.doubleClick(screen.getByText('trigger'))
  fireEvent.click(saveJourneyButton)
  await waitFor(() => expect(mockedApi.put).toHaveBeenCalledTimes(1))

  fireEvent.doubleClick(screen.getByText('end'))
  fireEvent.click(saveJourneyButton)
  await waitFor(() => expect(mockedApi.put).toHaveBeenCalledTimes(2))

  fireEvent.click(saveJourneyButton)
  await waitFor(() => expect(mockedApi.put).toHaveBeenCalledTimes(3))

  expect(backend.getJourneyCreateCount()).toBe(1)
  expect(backend.getJourneyRowCount()).toBe(1)
  const graph = JSON.parse(backend.getJourney().graphJson)
  expect(graph.nodes).toHaveLength(2)
})
