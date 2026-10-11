import type { Element } from '@journey/model/types'
import type { ScreenRuntime } from '../render/runtime'

type Action = NonNullable<Extract<Element, { type: 'buttons' }>['props']['items']>[number]['action']

function icsDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

function icsEscape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/([,;])/g, '\\$1')
}

export function calendarFile(action: Extract<Action, { kind: 'calendar' }>): string {
  const start = icsDate(action.start)
  const end = icsDate(action.end ?? '') || start
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Journeo//EN',
    'BEGIN:VEVENT',
    `UID:${start}-${Math.abs(hash(action.title))}@journeo`,
    `DTSTAMP:${start}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsEscape(action.title)}`,
    action.location ? `LOCATION:${icsEscape(action.location)}` : '',
    action.url ? `URL:${action.url}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`
}

function hash(value: string): number {
  let h = 0
  for (const ch of value) h = (Math.imul(31, h) + ch.charCodeAt(0)) | 0
  return h
}

export function runAction(
  action: Action,
  runtime: ScreenRuntime,
  context: { elementId: string; itemId: string; label: string },
): void {
  const base = { element: context.elementId, item: context.itemId, kind: action.kind }
  switch (action.kind) {
    case 'next':
      runtime.exit('next')
      return
    case 'goto':
      runtime.exit(`${context.elementId}:${context.itemId}`, { skipValidation: action.skipValidation ?? false })
      return
    case 'url':
      runtime.track({ ...base, url: action.url })
      runtime.openUrl(action.url, action.newTab ?? true, action.passParams ?? true)
      return
    case 'copy':
      runtime.track(base)
      void navigator.clipboard?.writeText(action.value).then(
        () => runtime.notify('Copied'),
        () => runtime.notify(action.value),
      )
      return
    case 'calendar': {
      runtime.track(base)
      if (runtime.mode === 'edit' || runtime.mode === 'thumbnail') return
      const link = document.createElement('a')
      link.href = calendarFile(action)
      link.download = `${action.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'event'}.ics`
      link.click()
      return
    }
    case 'tel':
    case 'mailto':
      runtime.track(base)
      if (runtime.mode === 'live') window.location.href = `${action.kind}:${action.value}`
      else runtime.notify(`${action.kind === 'tel' ? 'Call' : 'Email'} ${action.value}`)
      return
  }
}
