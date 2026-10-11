import { useId } from 'react'
import { useEditableText } from '../render/EditBridge'
import { personalizeText } from '../render/RichText'
import { useRuntime } from '../render/runtime'
import * as s from '../styles/elements.css'
import type { ElementOf, ElementProps } from './types'

const EMOJI = ['😞', '🙁', '😐', '🙂', '😄', '🤩', '😍', '🥳', '💯', '🚀', '🌟']

export function Rating({ element }: ElementProps<ElementOf<'rating'>>) {
  const runtime = useRuntime()
  const groupId = useId()
  const { props } = element
  const scale = props.scale ?? 'stars'
  const max = scale === 'nps' ? 10 : (props.max ?? 5)
  const min = scale === 'nps' ? 0 : 1
  const value = typeof runtime.answers[props.key] === 'number' ? (runtime.answers[props.key] as number) : null
  const error = runtime.errors[props.key]
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  const choose = (score: number) => {
    runtime.clearError(props.key)
    runtime.setAnswer(props.key, score)
  }
  return (
    <fieldset className={s.fieldset}>
      <legend className={s.legend} data-jx-text="" data-screen-heading="">
        <QuestionText elementId={element.id} question={props.question} vars={runtime.vars} mode={runtime.mode} />
      </legend>
      <div
        className={scale === 'stars' || scale === 'emoji' ? s.rating : s.ratingNumbers}
        role="radiogroup"
        aria-label={props.question}
      >
        {values.map(score => {
          const checked = value === score
          if (scale === 'stars') {
            return (
              <button
                key={score}
                type="button"
                role="radio"
                aria-checked={checked}
                aria-label={`${score} of ${max}`}
                data-on={value !== null && score <= value}
                data-jx-tap=""
                className={s.star}
                onClick={() => choose(score)}
              >
                ★
              </button>
            )
          }
          return (
            <button
              key={score}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={`${score} of ${max}`}
              data-jx-tap=""
              className={s.ratingCell}
              onClick={() => choose(score)}
            >
              {scale === 'emoji' ? EMOJI[Math.round(((score - min) / Math.max(1, max - min)) * 4)] : score}
            </button>
          )
        })}
      </div>
      {props.minLabel || props.maxLabel ? (
        <div className={s.ratingLabels} aria-hidden="true">
          <span>{props.minLabel}</span>
          <span>{props.maxLabel}</span>
        </div>
      ) : null}
      {error ? (
        <p id={`${groupId}-error`} className={s.error} role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}

function QuestionText({
  elementId,
  question,
  vars,
  mode,
}: {
  elementId: string
  question: string
  vars: Record<string, unknown>
  mode: string
}) {
  return useEditableText(
    {
      elementId,
      path: ['props', 'question'],
      value: question,
      rich: 'plain',
      fallback: personalizeText(question, vars),
    },
    mode,
  )
}
