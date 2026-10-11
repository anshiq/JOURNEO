import { cn } from '../classnames'
import { useEditableText } from '../render/EditBridge'
import { RichText } from '../render/RichText'
import { useRuntime } from '../render/runtime'
import * as s from '../styles/elements.css'
import type { ElementOf, ElementProps } from './types'

export function Text({ element, style, labels }: ElementProps<ElementOf<'text'>>) {
  const runtime = useRuntime()
  const content = useEditableText(
    {
      elementId: element.id,
      path: ['props', 'text'],
      value: element.props.text,
      rich: 'block',
      fallback: (
        <RichText text={element.props.text} vars={runtime.vars} labels={labels} listStyle={element.props.listStyle} />
      ),
    },
    runtime.mode,
  )
  return (
    <div
      data-jx-text=""
      className={cn(s.textPreset[element.props.preset ?? 'body'], style.size ? s.sizeScale[style.size] : undefined)}
    >
      {content}
    </div>
  )
}
