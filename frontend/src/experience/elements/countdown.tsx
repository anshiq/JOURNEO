import { useEffect, useState } from 'react'
import { useRuntime } from '../render/runtime'
import * as s from '../styles/elements.css'
import type { ElementOf, ElementProps } from './types'

function parts(ms: number): [number, number, number, number] {
  const total = Math.max(0, Math.floor(ms / 1000))
  return [Math.floor(total / 86400), Math.floor((total % 86400) / 3600), Math.floor((total % 3600) / 60), total % 60]
}

export function Countdown({ element }: ElementProps<ElementOf<'countdown'>>) {
  const runtime = useRuntime()
  const deadline = Date.parse(element.props.deadline)
  const [now, setNow] = useState(() => Date.now())
  const live = runtime.mode !== 'thumbnail'
  useEffect(() => {
    if (!live) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [live])
  if (Number.isNaN(deadline)) return null
  const remaining = deadline - now
  if (remaining <= 0) {
    if (element.props.onExpire === 'message' && element.props.message)
      return <p data-jx-text="">{element.props.message}</p>
    return runtime.mode === 'edit' ? <p className={s.hint}>Countdown ended</p> : null
  }
  const labels = element.props.labels ?? {}
  const units: [number, string][] = parts(remaining).map((value, i) => [
    value,
    [labels.days ?? 'Days', labels.hours ?? 'Hours', labels.minutes ?? 'Minutes', labels.seconds ?? 'Seconds'][i] ?? '',
  ])
  return (
    <div className={s.countdown} role="timer" aria-live="off">
      {units.map(([value, label]) => (
        <div key={label} className={s.countdownUnit}>
          <div className={s.countdownValue}>{String(value).padStart(2, '0')}</div>
          <div className={s.countdownLabel}>{label}</div>
        </div>
      ))}
    </div>
  )
}
