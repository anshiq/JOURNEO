import { AD_LAYOUT, DEFAULT_VIEWPORT, DEVICE_VIEWPORTS, VIEWPORT_ORDER, adLayoutFor, isViewportId } from './viewports'
import { getViewportForWidth } from './viewport'

test('DEVICE_VIEWPORTS has four viewport definitions', () => {
  const ids = Object.keys(DEVICE_VIEWPORTS)
  if (ids.length !== 4) throw new Error('expected 4 viewports')
  if (!('iphone14' in DEVICE_VIEWPORTS)) throw new Error('missing iphone14')
  if (!('pixel7' in DEVICE_VIEWPORTS)) throw new Error('missing pixel7')
  if (!('ipadAir' in DEVICE_VIEWPORTS)) throw new Error('missing ipadAir')
  if (!('desktopHD' in DEVICE_VIEWPORTS)) throw new Error('missing desktopHD')
})

test('DEVICE_VIEWPORTS dimensions match single source', () => {
  if (DEVICE_VIEWPORTS.iphone14.width !== 390) throw new Error('iphone14 width')
  if (DEVICE_VIEWPORTS.pixel7.width !== 412) throw new Error('pixel7 width')
  if (DEVICE_VIEWPORTS.ipadAir.width !== 820) throw new Error('ipadAir width')
  if (DEVICE_VIEWPORTS.desktopHD.width !== 1440) throw new Error('desktopHD width')
  if (DEVICE_VIEWPORTS.iphone14.height !== 844) throw new Error('iphone14 height')
  if (DEVICE_VIEWPORTS.pixel7.height !== 915) throw new Error('pixel7 height')
  if (DEVICE_VIEWPORTS.ipadAir.height !== 1180) throw new Error('ipadAir height')
  if (DEVICE_VIEWPORTS.desktopHD.height !== 900) throw new Error('desktopHD height')
})

test('VIEWPORT_ORDER covers every viewport once', () => {
  if (VIEWPORT_ORDER.length !== Object.keys(DEVICE_VIEWPORTS).length) throw new Error('order length')
  if (new Set(VIEWPORT_ORDER).size !== VIEWPORT_ORDER.length) throw new Error('order duplicates')
})

test('every viewport kind has ad layout tokens', () => {
  for (const id of VIEWPORT_ORDER) {
    const tokens = adLayoutFor(id)
    if (tokens !== AD_LAYOUT[DEVICE_VIEWPORTS[id].kind]) throw new Error(`layout mismatch for ${id}`)
    if (!(tokens.contentMaxWidth > 0)) throw new Error(`content width for ${id}`)
    if (!(tokens.stagePadding >= 0)) throw new Error(`stage padding for ${id}`)
  }
})

test('desktop ad content fits inside the desktop frame', () => {
  const spec = DEVICE_VIEWPORTS.desktopHD
  const tokens = adLayoutFor('desktopHD')
  if (tokens.contentMaxWidth + tokens.stagePadding * 2 > spec.width) throw new Error('desktop content overflows frame')
})

test('isViewportId guards unknown values', () => {
  if (!isViewportId('desktopHD')) throw new Error('desktopHD should be valid')
  if (isViewportId('phone')) throw new Error('phone should be invalid')
  if (isViewportId(null)) throw new Error('null should be invalid')
})

test('DEFAULT_VIEWPORT is iphone14', () => {
  if (DEFAULT_VIEWPORT !== 'iphone14') throw new Error('default viewport')
})

test('getViewportForWidth maps <480 to iphone14', () => {
  if (getViewportForWidth(0) !== 'iphone14') throw new Error('0')
  if (getViewportForWidth(320) !== 'iphone14') throw new Error('320')
  if (getViewportForWidth(479) !== 'iphone14') throw new Error('479')
})

test('getViewportForWidth maps <700 to pixel7', () => {
  if (getViewportForWidth(480) !== 'pixel7') throw new Error('480')
  if (getViewportForWidth(500) !== 'pixel7') throw new Error('500')
  if (getViewportForWidth(699) !== 'pixel7') throw new Error('699')
})

test('getViewportForWidth maps <1100 to ipadAir', () => {
  if (getViewportForWidth(700) !== 'ipadAir') throw new Error('700')
  if (getViewportForWidth(800) !== 'ipadAir') throw new Error('800')
  if (getViewportForWidth(1099) !== 'ipadAir') throw new Error('1099')
})

test('getViewportForWidth maps >=1100 to desktopHD', () => {
  if (getViewportForWidth(1100) !== 'desktopHD') throw new Error('1100')
  if (getViewportForWidth(1440) !== 'desktopHD') throw new Error('1440')
  if (getViewportForWidth(2000) !== 'desktopHD') throw new Error('2000')
})
