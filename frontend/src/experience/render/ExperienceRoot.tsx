import type { Theme } from '@journey/model/types'
import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { type Breakpoint, breakpointForWidth } from '../constants'
import { root } from '../styles/root.css'
import { backgroundStyle, compileTheme, resolveColors } from '../theme/compile'
import { loadFonts, resolveFonts } from '../theme/fonts'

export function ExperienceRoot({
  theme,
  breakpoint,
  onBreakpoint,
  className,
  style,
  children,
}: {
  theme: Theme | undefined
  breakpoint?: Breakpoint
  onBreakpoint?: (bp: Breakpoint) => void
  className?: string
  style?: CSSProperties
  children: (bp: Breakpoint) => ReactNode
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [measured, setMeasured] = useState<Breakpoint>(() =>
    typeof window === 'undefined' ? 'mobile' : breakpointForWidth(window.innerWidth),
  )
  const bp = breakpoint ?? measured
  const cssVars = useMemo(() => compileTheme(theme), [theme])
  const colors = useMemo(() => resolveColors(theme), [theme])
  const fonts = resolveFonts(theme?.fonts)

  useEffect(() => {
    loadFonts([fonts.heading, fonts.body])
  }, [fonts.heading, fonts.body])

  useLayoutEffect(() => {
    if (breakpoint || !ref.current || typeof ResizeObserver === 'undefined') return
    const node = ref.current
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width ?? node.clientWidth
      const next = breakpointForWidth(width)
      setMeasured(next)
      onBreakpoint?.(next)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [breakpoint, onBreakpoint])

  return (
    <div
      ref={ref}
      className={className ? `${root} ${className}` : root}
      data-bp={bp}
      style={{ ...(cssVars as CSSProperties), ...backgroundStyle(theme?.background, colors), ...style }}
    >
      {children(bp)}
    </div>
  )
}
