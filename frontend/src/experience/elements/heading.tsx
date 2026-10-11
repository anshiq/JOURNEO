import { cn } from '../classnames'
import { useEditableText } from '../render/EditBridge'
import { RichText } from '../render/RichText'
import { useRuntime } from '../render/runtime'
import * as s from '../styles/elements.css'
import type { ElementOf, ElementProps } from './types'

export function Heading({ element, style, labels }: ElementProps<ElementOf<'heading'>>) {
  const runtime = useRuntime()
  const level = element.props.level ?? 1
  const Tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3'
  const content = useEditableText(
    {
      elementId: element.id,
      path: ['props', 'text'],
      value: element.props.text,
      rich: 'inline',
      fallback: <RichText text={element.props.text} vars={runtime.vars} labels={labels} inline />,
    },
    runtime.mode,
  )
  return (
    <Tag
      data-jx-text=""
      data-screen-heading={runtime.isFirst || level === 1 ? '' : undefined}
      tabIndex={-1}
      className={cn(s.headingSize[Tag], style.size ? s.sizeScale[style.size] : undefined)}
    >
      {content}
    </Tag>
  )
}
