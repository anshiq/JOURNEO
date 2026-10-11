import { cn } from '../classnames'
import { personalizeText } from '../render/RichText'
import { useRuntime } from '../render/runtime'
import * as s from '../styles/elements.css'
import { runAction } from './actions'
import type { ElementOf, ElementProps } from './types'

export function Buttons({ element, style }: ElementProps<ElementOf<'buttons'>>) {
  const runtime = useRuntime()
  const layout = element.props.layout ?? 'auto'
  return (
    <div
      className={cn(
        s.buttons,
        layout === 'stack' && s.buttonsStack,
        layout === 'row' && s.buttonsRow,
        style.align === 'center' && s.buttonsCenter,
      )}
    >
      {(element.props.items ?? []).map(item => (
        <button
          key={item.id}
          type="button"
          data-jx-tap=""
          disabled={runtime.busy}
          className={cn(s.button[item.variant ?? 'primary'], s.buttonItem, style.fullWidth && s.buttonFull)}
          onClick={() => runAction(item.action, runtime, { elementId: element.id, itemId: item.id, label: item.label })}
        >
          {personalizeText(item.label, runtime.vars)}
        </button>
      ))}
    </div>
  )
}
