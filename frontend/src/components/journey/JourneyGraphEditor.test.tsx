import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import JourneyGraphEditor from './JourneyGraphEditor'
import { emptyGraph, type JourneyGraph } from '../../lib/journeyGraph'
import { validateGraph } from '../../lib/validation'

class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

;(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver || FakeResizeObserver

afterEach(() => cleanup())

function Harness({ onGraph }: { onGraph?: (g: JourneyGraph) => void }) {
  const [graph, setGraph] = useState<JourneyGraph>(emptyGraph())
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  return <div style={{ width: 800, height: 600 }}><JourneyGraphEditor graph={graph} onGraphChange={g => { setGraph(g); onGraph?.(g) }} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} /></div>
}

test('adding a flow node and a block preserves the v3 screen invariant', () => {
  const seen: JourneyGraph[] = []
  render(<Harness onGraph={g => seen.push(g)} />)
  fireEvent.doubleClick(screen.getByTestId('palette-item-trigger'))
  const first = seen[seen.length - 1]
  expect(first.nodes).toHaveLength(1)
  expect(first.nodes[0].type).toBe('trigger')
  fireEvent.doubleClick(screen.getByTestId('palette-item-text'))
  const graph = seen[seen.length - 1]
  expect(graph.nodes.map(n => n.type).sort()).toEqual(['text', 'trigger'])
  expect(graph.screens).toHaveLength(1)
  expect(graph.screens[0].blocks).toEqual([graph.nodes.find(n => n.type === 'text')!.id])
})

test('the screen palette item creates an empty screen', () => {
  const seen: JourneyGraph[] = []
  render(<Harness onGraph={g => seen.push(g)} />)
  fireEvent.click(screen.getByTestId('palette-item-screen'))
  const graph = seen[seen.length - 1]
  expect(graph.screens).toHaveLength(1)
  expect(graph.screens[0].blocks).toEqual([])
})

test('deleting a screen from the canvas removes it and its blocks', () => {
  const seen: JourneyGraph[] = []
  render(<Harness onGraph={g => seen.push(g)} />)
  fireEvent.doubleClick(screen.getByTestId('palette-item-text'))
  expect(seen[seen.length - 1].screens).toHaveLength(1)
  fireEvent.click(screen.getByLabelText('Delete screen'))
  const graph = seen[seen.length - 1]
  expect(graph.screens).toHaveLength(0)
  expect(graph.nodes).toHaveLength(0)
})

test('deleting a screen does not resurrect it as an empty ghost on the next sync', () => {
  const seen: JourneyGraph[] = []
  render(<Harness onGraph={g => seen.push(g)} />)
  fireEvent.doubleClick(screen.getByTestId('palette-item-trigger'))
  fireEvent.doubleClick(screen.getByTestId('palette-item-text'))
  fireEvent.click(screen.getByLabelText('Delete screen'))
  fireEvent.doubleClick(screen.getByTestId('palette-item-end'))
  const graph = seen[seen.length - 1]
  expect(graph.screens).toHaveLength(0)
  expect(graph.nodes.map(n => n.type).sort()).toEqual(['end', 'trigger'])
})

test('adding an ask_ai node floats outside screens and validates clean', () => {
  const seen: JourneyGraph[] = []
  render(<Harness onGraph={g => seen.push(g)} />)
  fireEvent.doubleClick(screen.getByTestId('palette-item-ask_ai'))
  const graph = seen[seen.length - 1]
  expect(graph.nodes.map(n => n.type)).toEqual(['ask_ai'])
  expect(graph.screens).toHaveLength(0)
  const errs = validateGraph(graph)
  expect(errs.filter(e => e.nodeId !== 'graph' && e.nodeId !== 'edges')).toEqual([])
})
