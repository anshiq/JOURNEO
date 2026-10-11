import * as s from '../styles/elements.css'
import type { ElementOf, ElementProps } from './types'

export function Spacer({ element }: ElementProps<ElementOf<'spacer'>>) {
  const size = element.props.size ?? 'md'
  return (
    <div className={s.spacer[size]} aria-hidden="true" style={{ display: 'flex', alignItems: 'center' }}>
      {element.props.line ? <div className={s.rule} /> : null}
    </div>
  )
}
