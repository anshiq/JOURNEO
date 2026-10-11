import type { Breakpoint } from '@experience/index'
import { cn } from '@shared/ui/cn'
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'

export const DEVICE_WIDTH: Record<Breakpoint, number> = { mobile: 390, tablet: 820, desktop: 1440 }
export const DEVICE_HEIGHT: Record<Breakpoint, number> = { mobile: 844, tablet: 1180, desktop: 900 }
export const DEVICE_LABEL: Record<Breakpoint, string> = { mobile: 'Mobile', tablet: 'Tablet', desktop: 'Desktop' }

export function useFitScale(device: Breakpoint, available: number, max = 1): number {
  const width = DEVICE_WIDTH[device]
  return Math.max(0.2, Math.min(max, (available - 48) / width))
}

export function DeviceFrame({
  device,
  scale,
  children,
  minHeight = true,
  className,
}: {
  device: Breakpoint
  scale: number
  children: ReactNode
  minHeight?: boolean
  className?: string
}) {
  const inner = useRef<HTMLDivElement | null>(null)
  const [height, setHeight] = useState(DEVICE_HEIGHT[device])
  useLayoutEffect(() => {
    const node = inner.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => setHeight(node.offsetHeight))
    observer.observe(node)
    setHeight(node.offsetHeight)
    return () => observer.disconnect()
  }, [])
  const width = DEVICE_WIDTH[device]
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-[20px] bg-white shadow-lg ring-1 ring-slate-300',
        className,
      )}
      style={{ width: width * scale, height: height * scale }}
      data-device={device}
    >
      <div
        ref={inner}
        style={{
          width,
          minHeight: minHeight ? DEVICE_HEIGHT[device] : undefined,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </div>
  )
}
