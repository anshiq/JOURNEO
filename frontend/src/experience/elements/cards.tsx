import type { CSSProperties } from 'react'
import { cn } from '../classnames'
import { useRuntime } from '../render/runtime'
import * as s from '../styles/elements.css'
import { runAction } from './actions'
import type { ElementOf, ElementProps } from './types'

export function Cards({ element }: ElementProps<ElementOf<'cards'>>) {
  const runtime = useRuntime()
  const items = element.props.items ?? []
  const layout = element.props.layout ?? 'auto'
  const carousel = layout === 'carousel' || (layout === 'auto' && runtime.breakpoint === 'mobile' && items.length > 2)
  const className = layout === 'list' ? s.cardsList : carousel ? s.cardsCarousel : s.cards
  const columns = element.props.columns ?? Math.min(3, Math.max(1, items.length))
  return (
    <div className={className} style={{ '--jx-cols': String(columns) } as CSSProperties}>
      {items.map(item => (
        <article key={item.id} className={s.card}>
          {item.image ? (
            <img src={item.image} alt={item.imageAlt ?? ''} className={s.cardImage} loading="lazy" />
          ) : null}
          {item.badge ? <span className={s.badge}>{item.badge}</span> : null}
          <div className={s.cardBody}>
            <h3 data-jx-text="" style={{ fontSize: '1.1em' }}>
              {item.title}
            </h3>
            {item.price ? <p className={s.price}>{item.price}</p> : null}
            {item.text ? <p>{item.text}</p> : null}
            {item.button ? (
              <div className={s.cardAction}>
                <button
                  type="button"
                  data-jx-tap=""
                  disabled={runtime.busy}
                  className={cn(s.button.primary, s.buttonItem)}
                  style={{ width: '100%' }}
                  onClick={() => {
                    const button = item.button
                    if (button)
                      runAction(button.action, runtime, { elementId: element.id, itemId: item.id, label: button.label })
                  }}
                >
                  {item.button.label}
                </button>
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  )
}
