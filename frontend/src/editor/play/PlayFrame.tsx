import type { Breakpoint } from '@experience/index'
import type { JourneyDoc } from '@journey/model/types'
import { useEffect, useRef } from 'react'
import { DEVICE_HEIGHT, DEVICE_WIDTH } from '../canvas/DeviceFrame'

export interface StepInfo {
  stepId: string | null
  vars: Record<string, unknown>
  matched?: { stepId: string; ruleId: string }
  status: string
}

export function PlayFrame({
  doc,
  startAt,
  device,
  scale,
  onStep,
  title,
}: {
  doc: JourneyDoc
  startAt: string | null
  device: Breakpoint
  scale: number
  onStep?: (info: StepInfo) => void
  title: string
}) {
  const frame = useRef<HTMLIFrameElement | null>(null)
  const docRef = useRef(doc)
  const startRef = useRef(startAt)
  const stepRef = useRef(onStep)
  docRef.current = doc
  startRef.current = startAt
  stepRef.current = onStep
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return
      const data = event.data as { type?: string; info?: StepInfo } | null
      if (data?.type === 'jx:ready') {
        frame.current?.contentWindow?.postMessage(
          { type: 'jx:load', doc: docRef.current, ...(startRef.current ? { startAt: startRef.current } : {}), device },
          window.location.origin,
        )
      } else if (data?.type === 'jx:step' && data.info) {
        stepRef.current?.(data.info)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [device])
  const width = DEVICE_WIDTH[device]
  const height = DEVICE_HEIGHT[device]
  return (
    <div
      className="overflow-hidden rounded-[20px] bg-white shadow-xl ring-1 ring-slate-300"
      style={{ width: width * scale, height: height * scale }}
    >
      <iframe
        ref={frame}
        title={title}
        src="/play?embed=1"
        style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'top left', border: 0 }}
      />
    </div>
  )
}
