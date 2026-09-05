import type { DeviceName } from 'react-device-bezels'
import type { ViewportId } from '../../lib/viewports'

export type FrameDevice = DeviceName | 'macbook-14' | 'desktop-1440'

export const DEVICE_CHOICES: Array<{ name: FrameDevice; viewport: ViewportId; group: string }> = [
  { name: 'iphone-16-pro', viewport: 'iphone14', group: 'Phones' },
  { name: 'iphone-16', viewport: 'iphone14', group: 'Phones' },
  { name: 'iphone-15-pro', viewport: 'iphone14', group: 'Phones' },
  { name: 'iphone-14-pro', viewport: 'iphone14', group: 'Phones' },
  { name: 'pixel-9-pro', viewport: 'pixel7', group: 'Phones' },
  { name: 'galaxy-s25', viewport: 'pixel7', group: 'Phones' },
  { name: 'oneplus-13', viewport: 'pixel7', group: 'Phones' },
  { name: 'galaxy-z-fold-6', viewport: 'ipadAir', group: 'Foldables' },
  { name: 'galaxy-z-flip-6', viewport: 'iphone14', group: 'Foldables' },
  { name: 'pixel-9-pro-fold', viewport: 'ipadAir', group: 'Foldables' },
  { name: 'oneplus-open', viewport: 'ipadAir', group: 'Foldables' },
  { name: 'ipad-pro-13', viewport: 'ipadAir', group: 'Tablets' },
  { name: 'ipad-air-11', viewport: 'ipadAir', group: 'Tablets' },
  { name: 'ipad-mini', viewport: 'ipadAir', group: 'Tablets' },
  { name: 'galaxy-tab-s10-ultra', viewport: 'ipadAir', group: 'Tablets' },
  { name: 'pixel-tablet', viewport: 'ipadAir', group: 'Tablets' },
  { name: 'macbook-14', viewport: 'desktopHD', group: 'Laptops' },
  { name: 'desktop-1440', viewport: 'desktopHD', group: 'Desktops' },
]

export const DEVICE_GROUPS = ['Phones', 'Foldables', 'Tablets', 'Laptops', 'Desktops']

export function viewportForDevice(name: FrameDevice): ViewportId {
  return DEVICE_CHOICES.find(c => c.name === name)?.viewport || 'iphone14'
}

export function initialDeviceForViewport(viewportId: ViewportId): FrameDevice {
  if (viewportId === 'pixel7') return 'pixel-9-pro'
  if (viewportId === 'ipadAir') return 'ipad-pro-13'
  if (viewportId === 'desktopHD') return 'desktop-1440'
  return 'iphone-16-pro'
}
