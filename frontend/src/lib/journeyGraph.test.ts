import {
  parseGraph,
  serializeGraph,
  emptyGraph,
  patchNode,
  resetNodeStyle,
  defaultScreenValues,
  groupIntoScreen,
  ungroupScreen,
  reorderBlocks,
  mergedScreenTheme,
  hasContent,
  GraphParseError,
  DEFAULT_THEME,
} from './journeyGraph'

test('parseGraph rejects missing or unsupported schema', () => {
  expect(() => parseGraph('{}')).toThrow(GraphParseError)
  expect(() => parseGraph(JSON.stringify({ schemaVersion: 2, nodes: [], screens: [], edges: [] }))).toThrow(GraphParseError)
})

test('parseGraph on null or blank returns an empty v3 graph', () => {
  expect(parseGraph(null).schemaVersion).toBe(3)
  expect(parseGraph('').screens).toEqual([])
  expect(parseGraph('').askAi).not.toBeNull()
})

test('parseGraph normalizes a v3 graph', () => {
  const g = parseGraph(JSON.stringify({ schemaVersion: 3, theme: {}, screens: [{ id: 's1', blocks: [] }], nodes: [], edges: [] }))
  expect(g.screens[0].id).toBe('s1')
  expect(g.theme).toMatchObject(DEFAULT_THEME)
})

test('serializeGraph round-trips a v3 graph', () => {
  const g = emptyGraph()
  const screen = defaultScreenValues()
  screen.id = 's1'
  screen.blocks = ['n1']
  g.screens = [screen]
  g.nodes.push({ id: 'n1', type: 'text', position: { x: 5, y: 5 }, config: { content: 'hi' } })
  const parsed = parseGraph(serializeGraph(g))
  expect(parsed.screens[0].blocks).toEqual(['n1'])
  expect(parsed.nodes[0].position).toEqual({ x: 5, y: 5 })
})

test('patchNode preserves unknown keys and merges style', () => {
  const g = emptyGraph()
  g.nodes.push({ id: 'n1', type: 'text', position: { x: 0, y: 0 }, label: 'My node', config: { custom: 42, style: { backgroundColor: 'red' } } })
  const next = patchNode(g, 'n1', { style: { foregroundColor: 'white' } })
  expect(next.nodes[0].label).toBe('My node')
  expect(next.nodes[0].config.custom).toBe(42)
  expect(next.nodes[0].config.style).toEqual({ backgroundColor: 'red', foregroundColor: 'white' })
})

test('resetNodeStyle removes per-block style', () => {
  const g = emptyGraph()
  g.nodes.push({ id: 'n1', type: 'text', position: { x: 0, y: 0 }, config: { style: { foregroundColor: 'red' } } })
  const next = resetNodeStyle(g, 'n1')
  expect(next.nodes[0].config.style).toBeUndefined()
})

test('groupIntoScreen rewires external edges and removes block membership', () => {
  const g = emptyGraph()
  g.screens = [{ ...defaultScreenValues(), id: 'old', blocks: ['a'] }]
  g.nodes = [
    { id: 't', type: 'trigger', position: { x: 0, y: 0 }, config: {} },
    { id: 'a', type: 'text', position: { x: 10, y: 30 }, config: {} },
    { id: 'b', type: 'text', position: { x: 10, y: 10 }, config: {} },
    { id: 'e', type: 'end', position: { x: 300, y: 0 }, config: {} },
  ]
  g.edges = [{ id: 'in', source: 't', target: 'a' }, { id: 'out', source: 'b', target: 'e' }]
  const next = groupIntoScreen(g, ['a', 'b'])
  const grouped = next.screens.find(s => s.id !== 'old')!
  expect(grouped.blocks).toEqual(['b', 'a'])
  expect(next.edges.some(e => e.source === 't' && e.target === grouped.id)).toBe(true)
  expect(next.edges.some(e => e.source === grouped.id && e.target === 'e')).toBe(true)
})

test('ungroupScreen chains promoted single-block screens', () => {
  const g = emptyGraph()
  g.screens = [{ ...defaultScreenValues(), id: 's1', name: 'Main', blocks: ['a', 'b'] }]
  g.nodes = [{ id: 'a', type: 'text', position: { x: 0, y: 0 }, config: {} }, { id: 'b', type: 'text', position: { x: 0, y: 1 }, config: {} }]
  g.edges = [{ id: 'in', source: 't', target: 's1' }, { id: 'out', source: 's1', target: 'e' }]
  const next = ungroupScreen(g, 's1')
  expect(next.screens).toHaveLength(2)
  expect(next.edges.filter(e => e.source !== 't' && e.target !== 'e')).toHaveLength(1)
})

test('reorderBlocks and mergedScreenTheme preserve explicit precedence', () => {
  const g = emptyGraph()
  g.theme = { ...DEFAULT_THEME, primary: '#111111' }
  g.screens = [{ ...defaultScreenValues(), id: 's1', blocks: ['a'], theme: { primary: '#222222' } }]
  const next = reorderBlocks(g, 's1', ['a'])
  expect(next.screens[0].blocks).toEqual(['a'])
  expect(mergedScreenTheme(next, 's1').primary).toBe('#222222')
})

test('hasContent reflects screens and nodes', () => {
  expect(hasContent(emptyGraph())).toBe(false)
  const g = emptyGraph()
  g.screens = [{ ...defaultScreenValues(), blocks: [] }]
  expect(hasContent(g)).toBe(true)
})
