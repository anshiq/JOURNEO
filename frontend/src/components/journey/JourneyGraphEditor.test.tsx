import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import JourneyGraphEditor from './JourneyGraphEditor'
import { emptyGraph, type JourneyGraph } from '../../lib/journeyGraph'

class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver || FakeResizeObserver

afterEach(() => {
  cleanup()
})

function Harness({ onGraph }: { onGraph?: (g: JourneyGraph) => void }) {
  const [graph, setGraph] = useState<JourneyGraph>(emptyGraph())
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  return (
    <div style={{ width: 800, height: 600 }}>
      <JourneyGraphEditor
        graph={graph}
        onGraphChange={g => { setGraph(g); onGraph?.(g) }}
        selectedNodeId={selectedNodeId}
        onSelectNode={setSelectedNodeId}
      />
    </div>
  )
}

test('double-clicking a palette entry structurally updates the emitted graph', async () => {
  const seen: JourneyGraph[] = []
  render(<Harness onGraph={g => seen.push(g)} />)

  fireEvent.doubleClick(screen.getByTestId('palette-item-trigger'))
  expect(seen.length).toBeGreaterThan(0)
  expect(seen[seen.length - 1].nodes).toHaveLength(1)
  expect(seen[seen.length - 1].nodes[0].type).toBe('trigger')

  fireEvent.doubleClick(screen.getByTestId('palette-item-text'))
  expect(seen[seen.length - 1].nodes).toHaveLength(2)
  expect(seen[seen.length - 1].nodes.map(n => n.type).sort()).toEqual(['text', 'trigger'])
})

test('double-clicking ask_ai twice only ever adds a single instance and selects the existing one', async () => {
  const seen: JourneyGraph[] = []
  let selected: string | null = null
  function Wrapper() {
    const [graph, setGraph] = useState<JourneyGraph>(emptyGraph())
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
    selected = selectedNodeId
    return (
      <div style={{ width: 800, height: 600 }}>
        <JourneyGraphEditor
          graph={graph}
          onGraphChange={g => { setGraph(g); seen.push(g) }}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
        />
      </div>
    )
  }
  render(<Wrapper />)

  fireEvent.doubleClick(screen.getByTestId('palette-item-ask_ai'))
  expect(seen[seen.length - 1].nodes).toHaveLength(1)
  const firstId = seen[seen.length - 1].nodes[0].id
  expect(selected).toBe(firstId)

  fireEvent.doubleClick(screen.getByTestId('palette-item-ask_ai'))
  expect(seen[seen.length - 1].nodes).toHaveLength(1)
  expect(selected).toBe(firstId)
})

test('onGraphChange never emits more than one ask_ai node even across many adds', async () => {
  const seen: JourneyGraph[] = []
  render(<Harness onGraph={g => seen.push(g)} />)

  for (let i = 0; i < 5; i++) {
    fireEvent.doubleClick(screen.getByTestId('palette-item-ask_ai'))
  }

  const askAiCount = seen[seen.length - 1].nodes.filter(n => n.type === 'ask_ai').length
  expect(askAiCount).toBe(1)
})
