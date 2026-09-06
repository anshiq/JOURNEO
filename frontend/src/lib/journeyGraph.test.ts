import {
  parseGraph,
  serializeGraph,
  emptyGraph,
  patchNode,
  resetNodeStyle,
  effectiveTheme,
  hasContent,
  GraphParseError,
  DEFAULT_THEME,
} from './journeyGraph'

test('parseGraph on an empty object throws because nodes is missing', () => {
  expect(() => parseGraph('{}')).toThrow(GraphParseError)
})

test('parseGraph on null/blank returns empty graph', () => {
  expect(parseGraph(null).nodes).toEqual([])
  expect(parseGraph('').nodes).toEqual([])
})

test('parseGraph throws when nodes is not an array', () => {
  expect(() => parseGraph(JSON.stringify({ nodes: null, edges: [] }))).toThrow(GraphParseError)
})

test('parseGraph accepts an empty nodes array', () => {
  const g = parseGraph(JSON.stringify({ nodes: [], edges: [] }))
  expect(g.nodes).toEqual([])
})

test('parseGraph folds legacy nodeStyles and nodeOverrides into config', () => {
  const raw = {
    nodes: [{ id: 'n1', type: 'text', position: { x: 1, y: 2 }, config: { label: 'hi' } }],
    edges: [],
    nodeStyles: { n1: { backgroundColor: 'red' } },
    nodeOverrides: { n1: { primary: '#000' } },
  }
  const g = parseGraph(JSON.stringify(raw))
  expect(g.nodes[0].config.style).toEqual({ backgroundColor: 'red' })
  expect(g.nodes[0].config.theme).toEqual({ primary: '#000' })
  expect((g as any).nodeStyles).toBeUndefined()
  expect((g as any).nodeOverrides).toBeUndefined()
})

test('parseGraph migrates pruned node types', () => {
  const raw = { nodes: [{ id: 'n1', type: 'gallery', position: { x: 0, y: 0 }, config: {} }], edges: [] }
  const g = parseGraph(JSON.stringify(raw))
  expect(g.nodes[0].type).toBe('image')
})

test('parseGraph keeps known node types unchanged', () => {
  const raw = { nodes: [{ id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, config: {} }], edges: [] }
  const g = parseGraph(JSON.stringify(raw))
  expect(g.nodes[0].type).toBe('trigger')
})

test('serializeGraph round-trips through parseGraph', () => {
  const g = emptyGraph()
  g.nodes.push({ id: 'n1', type: 'text', position: { x: 5, y: 5 }, config: { label: 'hi' } })
  const json = serializeGraph(g)
  const parsed = parseGraph(json)
  expect(parsed.nodes[0].id).toBe('n1')
  expect(parsed.nodes[0].position).toEqual({ x: 5, y: 5 })
})

test('patchNode preserves label and unknown config keys', () => {
  const g = emptyGraph()
  g.nodes.push({ id: 'n1', type: 'text', position: { x: 0, y: 0 }, label: 'My node', config: { label: 'hi', custom: 42 } })
  const next = patchNode(g, 'n1', { style: { backgroundColor: 'blue' } })
  expect(next.nodes[0].label).toBe('My node')
  expect(next.nodes[0].config.custom).toBe(42)
  expect(next.nodes[0].config.label).toBe('hi')
  expect(next.nodes[0].config.style).toEqual({ backgroundColor: 'blue' })
})

test('patchNode merges style patches instead of replacing them', () => {
  const g = emptyGraph()
  g.nodes.push({ id: 'n1', type: 'text', position: { x: 0, y: 0 }, config: { style: { backgroundColor: 'red' } } })
  const next = patchNode(g, 'n1', { style: { foregroundColor: 'white' } })
  expect(next.nodes[0].config.style).toEqual({ backgroundColor: 'red', foregroundColor: 'white' })
})

test('resetNodeStyle removes style and theme keys', () => {
  const g = emptyGraph()
  g.nodes.push({ id: 'n1', type: 'text', position: { x: 0, y: 0 }, config: { label: 'hi', style: { foregroundColor: 'red' }, theme: { primary: '#000' } } })
  const next = resetNodeStyle(g, 'n1')
  expect(next.nodes[0].config.style).toBeUndefined()
  expect(next.nodes[0].config.theme).toBeUndefined()
  expect(next.nodes[0].config.label).toBe('hi')
})

test('effectiveTheme honours explicit 0 and empty-string overrides', () => {
  const g = emptyGraph()
  g.theme = { ...DEFAULT_THEME, radius: 16, cta: 'Shop now' }
  g.nodes.push({ id: 'n1', type: 'text', position: { x: 0, y: 0 }, config: { theme: { radius: 0, cta: '' } } })
  const t = effectiveTheme(g, 'n1')
  expect(t.radius).toBe(0)
  expect(t.cta).toBe('')
})

test('effectiveTheme falls back to graph theme with no node override', () => {
  const g = emptyGraph()
  g.nodes.push({ id: 'n1', type: 'text', position: { x: 0, y: 0 }, config: {} })
  const t = effectiveTheme(g, 'n1')
  expect(t).toEqual(g.theme)
})

test('hasContent reflects node count', () => {
  expect(hasContent(emptyGraph())).toBe(false)
  const g = emptyGraph()
  g.nodes.push({ id: 'n1', type: 'text', position: { x: 0, y: 0 }, config: {} })
  expect(hasContent(g)).toBe(true)
})
