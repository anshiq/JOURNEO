export const BREAKPOINTS = { tablet: 640, desktop: 1024 } as const
export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

export function breakpointForWidth(width: number): Breakpoint {
  if (width >= BREAKPOINTS.desktop) return 'desktop'
  if (width >= BREAKPOINTS.tablet) return 'tablet'
  return 'mobile'
}
