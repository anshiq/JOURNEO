import type { ButtonItem } from '@journey/model/types'
import { LIMITS } from '@shared/limits.gen'
import { Select } from '../../ui/Select'
import { Switch } from '../../ui/Switch'
import { DateTimeControl, TextControl } from '../controls'
import { DestinationPicker } from './DestinationPicker'

type Action = ButtonItem['action']

const KINDS: { value: Action['kind']; label: string }[] = [
  { value: 'next', label: 'Go to the next screen' },
  { value: 'goto', label: 'Go to a screen…' },
  { value: 'url', label: 'Open a website' },
  { value: 'copy', label: 'Copy text' },
  { value: 'calendar', label: 'Add to calendar' },
  { value: 'tel', label: 'Call a number' },
  { value: 'mailto', label: 'Send an email' },
]

function fresh(kind: Action['kind']): Action {
  switch (kind) {
    case 'next':
      return { kind: 'next' }
    case 'goto':
      return { kind: 'goto', skipValidation: false }
    case 'url':
      return { kind: 'url', url: 'https://', newTab: false, passParams: true }
    case 'copy':
      return { kind: 'copy', value: '' }
    case 'calendar': {
      const start = new Date(Date.now() + 7 * 86_400_000)
      start.setMinutes(0, 0, 0)
      return { kind: 'calendar', title: 'Event', start: start.toISOString().replace(/\.\d{3}Z$/, 'Z') }
    }
    case 'tel':
      return { kind: 'tel', value: '' }
    case 'mailto':
      return { kind: 'mailto', value: '' }
  }
}

export function ActionEditor({
  action,
  onChange,
  screenId,
  port,
}: {
  action: Action
  onChange: (action: Action) => void
  screenId: string
  port: string
}) {
  return (
    <div className="space-y-2">
      <Select
        aria-label="When clicked"
        className="h-8 text-xs"
        value={action.kind}
        options={KINDS}
        onChange={event => onChange(fresh(event.target.value as Action['kind']))}
      />
      {action.kind === 'goto' ? (
        <>
          <DestinationPicker stepId={screenId} port={port} fallback="next" />
          <Switch
            label="Skip required questions"
            hint="Useful for a Skip button"
            checked={action.skipValidation ?? false}
            onChange={skipValidation => onChange({ ...action, skipValidation })}
          />
        </>
      ) : null}
      {action.kind === 'url' ? (
        <>
          <TextControl
            label="Website address"
            field="url"
            type="url"
            max={LIMITS.url}
            value={action.url}
            onChange={url => onChange({ ...action, url })}
          />
          <Switch
            label="Open in a new tab"
            checked={action.newTab ?? false}
            onChange={newTab => onChange({ ...action, newTab })}
          />
          <Switch
            label="Pass link tracking"
            hint="Adds the visitor's campaign source to the address"
            checked={action.passParams ?? false}
            onChange={passParams => onChange({ ...action, passParams })}
          />
        </>
      ) : null}
      {action.kind === 'copy' ? (
        <TextControl
          label="Text to copy"
          max={LIMITS.coupon_code}
          value={action.value}
          onChange={value => onChange({ ...action, value })}
        />
      ) : null}
      {action.kind === 'tel' ? (
        <TextControl
          label="Phone number"
          type="tel"
          max={LIMITS.phone}
          value={action.value}
          onChange={value => onChange({ ...action, value })}
        />
      ) : null}
      {action.kind === 'mailto' ? (
        <TextControl
          label="Email address"
          type="email"
          max={LIMITS.email}
          value={action.value}
          onChange={value => onChange({ ...action, value })}
        />
      ) : null}
      {action.kind === 'calendar' ? (
        <>
          <TextControl
            label="Event title"
            max={LIMITS.calendar_title}
            value={action.title}
            onChange={title => onChange({ ...action, title })}
          />
          <DateTimeControl
            label="Starts"
            value={action.start}
            onChange={start => start && onChange({ ...action, start })}
          />
          <DateTimeControl label="Ends" value={action.end} onChange={end => onChange({ ...action, end })} />
          <TextControl
            label="Location"
            max={LIMITS.calendar_location}
            value={action.location}
            onChange={location => onChange({ ...action, location })}
          />
          <TextControl
            label="Event link"
            type="url"
            max={LIMITS.url}
            value={action.url}
            onChange={url => onChange({ ...action, url })}
          />
        </>
      ) : null}
    </div>
  )
}
