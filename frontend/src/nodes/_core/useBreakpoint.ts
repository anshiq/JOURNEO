import * as React from 'react'
import type { Breakpoint } from './types'

export function resolve(width: number): Breakpoint {
  if (width < 480) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

export function useBreakpoint(ref: React.RefObject<HTMLElement | null>, viewportMode?: boolean, forced?: Breakpoint): Breakpoint {
  const [breakpoint, setBreakpoint] = React.useState<Breakpoint>('desktop')

  React.useEffect(() => {
    if (forced) return
    if (viewportMode) {
      const update = () => setBreakpoint(resolve(window.innerWidth))
      update()
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
    const el = ref.current
    if (!el) return
    const update = () => setBreakpoint(resolve(el.getBoundingClientRect().width))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, viewportMode, forced])

  return forced || breakpoint
}

export default useBreakpoint
