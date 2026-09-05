import { bus } from './eventBus'
import { DEVICE_VIEWPORTS } from './viewports'

beforeEach(() => bus.all.clear())

test('node:select updates two subscribers', () => {
  let a = ''
  let b = ''
  bus.on('node:select', (p: any) => { a = p.nodeId })
  bus.on('node:select', (p: any) => { b = p.nodeId })
  bus.emit('node:select', { nodeId: 'n1', source: 'canvas' })
  if (a !== 'n1' || b !== 'n1') throw new Error('subscribers not updated')
})

test('device:viewportChange carries DEVICE_VIEWPORTS width', () => {
  let w = 0
  bus.on('device:viewportChange', (p: any) => { w = p.width })
  bus.emit('device:viewportChange', { viewportId: 'ipadAir', width: DEVICE_VIEWPORTS.ipadAir.width, height: DEVICE_VIEWPORTS.ipadAir.height })
  if (w !== 820) throw new Error('viewport width mismatch')
})
