export type ViewportId = 'iphone14' | 'pixel7' | 'ipadAir' | 'desktopHD'
export type ViewportKind = 'mobile' | 'tablet' | 'desktop'
export interface ViewportSpec {
  id: ViewportId
  name: string
  width: number
  height: number
  kind: ViewportKind
}
export const DEVICE_VIEWPORTS: Record<ViewportId, ViewportSpec> = {
  iphone14: { id: 'iphone14', name: 'iPhone 14', width: 390, height: 844, kind: 'mobile' },
  pixel7: { id: 'pixel7', name: 'Pixel 7', width: 412, height: 915, kind: 'mobile' },
  ipadAir: { id: 'ipadAir', name: 'iPad Air', width: 820, height: 1180, kind: 'tablet' },
  desktopHD: { id: 'desktopHD', name: 'Desktop HD', width: 1440, height: 900, kind: 'desktop' },
}
export const VIEWPORT_ORDER: ViewportId[] = ['iphone14', 'pixel7', 'ipadAir', 'desktopHD']
export const DEFAULT_VIEWPORT: ViewportId = 'iphone14'
export interface AdLayoutTokens {
  stagePadding: number
  contentMaxWidth: number
  cardPadding: number
  blockGap: number
  advanceBarHeight: number
}
export const AD_LAYOUT: Record<ViewportKind, AdLayoutTokens> = {
  mobile: { stagePadding: 16, contentMaxWidth: 420, cardPadding: 16, blockGap: 12, advanceBarHeight: 56 },
  tablet: { stagePadding: 32, contentMaxWidth: 640, cardPadding: 24, blockGap: 16, advanceBarHeight: 64 },
  desktop: { stagePadding: 48, contentMaxWidth: 880, cardPadding: 32, blockGap: 20, advanceBarHeight: 64 },
}
export function isViewportId(value: unknown): value is ViewportId {
  return typeof value === 'string' && value in DEVICE_VIEWPORTS
}
export function viewportSpec(id: ViewportId): ViewportSpec {
  return DEVICE_VIEWPORTS[id]
}
export function adLayoutFor(id: ViewportId): AdLayoutTokens {
  return AD_LAYOUT[DEVICE_VIEWPORTS[id].kind]
}
