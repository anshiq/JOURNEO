import { cn } from '../classnames'
import { useRuntime } from '../render/runtime'
import { resolveSrc } from '../responsive/resolve'
import * as s from '../styles/elements.css'
import { runAction } from './actions'
import type { ElementOf, ElementProps } from './types'

export function Image({ element, style }: ElementProps<ElementOf<'image'>>) {
  const runtime = useRuntime()
  const { props } = element
  const { src, srcset } = resolveSrc(element, runtime.breakpoint, props.src)
  const aspect = props.aspect ?? 'auto'
  const focal = props.focal ?? { x: 50, y: 50 }
  const img = (
    <img
      src={src}
      srcSet={srcset ?? props.srcset ?? undefined}
      sizes="(min-width: 1040px) 1040px, 100vw"
      alt={props.alt ?? ''}
      width={props.width ?? undefined}
      height={props.height ?? undefined}
      loading={runtime.isFirst ? 'eager' : 'lazy'}
      decoding="async"
      className={aspect === 'auto' ? s.imageNatural : s.imageFill}
      style={{
        objectPosition: `${focal.x ?? 50}% ${focal.y ?? 50}%`,
        backgroundColor: props.dominantColor ?? undefined,
      }}
    />
  )
  const frame = cn(s.imageFrame, s.imageAspect[aspect], style.radius ? s.radius[style.radius] : undefined)
  const action = props.action
  return (
    <figure>
      {action ? (
        <button
          type="button"
          className={cn(frame, s.tap)}
          style={{ display: 'block', width: '100%', padding: 0 }}
          onClick={() =>
            runAction(action, runtime, { elementId: element.id, itemId: 'image', label: props.alt ?? 'Image' })
          }
          aria-label={props.alt || 'Open'}
        >
          {img}
        </button>
      ) : (
        <div className={frame}>{img}</div>
      )}
      {props.attribution ? <figcaption className={s.attribution}>{props.attribution}</figcaption> : null}
    </figure>
  )
}
