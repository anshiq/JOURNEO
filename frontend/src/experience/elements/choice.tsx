import { LIMITS } from '@shared/limits.gen'
import { type ReactNode, useId, useMemo } from 'react'
import { cn } from '../classnames'
import { useEditableText } from '../render/EditBridge'
import { personalizeText } from '../render/RichText'
import { useRuntime } from '../render/runtime'
import * as s from '../styles/elements.css'
import type { ElementOf, ElementProps } from './types'

function seeded(seed: string): () => number {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], seed: string): T[] {
  const random = seeded(seed)
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const tmp = out[i] as T
    out[i] = out[j] as T
    out[j] = tmp
  }
  return out
}

function OptionGroup({
  multiple,
  label,
  className,
  children,
}: {
  multiple: boolean
  label: string
  className: string
  children: ReactNode
}) {
  return multiple ? (
    <div className={className} role="group" aria-label={label}>
      {children}
    </div>
  ) : (
    <div className={className} role="radiogroup" aria-label={label}>
      {children}
    </div>
  )
}

function OptionButton({
  multiple,
  checked,
  className,
  onClick,
  children,
}: {
  multiple: boolean
  checked: boolean
  className: string
  onClick: () => void
  children: ReactNode
}) {
  return multiple ? (
    <button type="button" role="checkbox" aria-checked={checked} data-jx-tap="" className={className} onClick={onClick}>
      {children}
    </button>
  ) : (
    <button type="button" role="radio" aria-checked={checked} data-jx-tap="" className={className} onClick={onClick}>
      {children}
    </button>
  )
}

export function Choice({ element }: ElementProps<ElementOf<'choice'>>) {
  const runtime = useRuntime()
  const groupId = useId()
  const { props } = element
  const multiple = props.multiple ?? false
  const display = props.display ?? 'list'
  const key = props.key
  const value = runtime.answers[key]
  const selected = multiple
    ? Array.isArray(value)
      ? (value as string[])
      : []
    : typeof value === 'string'
      ? [value]
      : []
  const options = useMemo(
    () => (props.randomize ? shuffle(props.options ?? [], element.id) : (props.options ?? [])),
    [props.randomize, props.options, element.id],
  )
  const error = runtime.errors[key]
  const otherKey = `${key}__other`
  const otherText = typeof runtime.answers[otherKey] === 'string' ? (runtime.answers[otherKey] as string) : ''

  const choose = (id: string) => {
    runtime.clearError(key)
    if (multiple) {
      const next = selected.includes(id) ? selected.filter(v => v !== id) : [...selected, id]
      if (props.max && next.length > props.max) return
      runtime.setAnswer(key, next)
      return
    }
    runtime.setAnswer(key, id, { advance: (props.autoAdvance ?? false) && id !== 'other' })
  }

  const listClass =
    display === 'buttons'
      ? s.optionsButtons
      : display === 'pictures'
        ? s.optionsPictures
        : display === 'yesno'
          ? s.optionsYesNo
          : s.options

  return (
    <fieldset className={s.fieldset} aria-describedby={error ? `${groupId}-error` : undefined}>
      <legend className={s.legend} data-jx-text="" data-screen-heading="">
        <QuestionText elementId={element.id} question={props.question} vars={runtime.vars} mode={runtime.mode} />
      </legend>
      {multiple && (props.min || props.max) ? (
        <p className={s.hint}>
          {props.min && props.max
            ? `Choose ${props.min} to ${props.max}`
            : props.max
              ? `Choose up to ${props.max}`
              : `Choose at least ${props.min}`}
        </p>
      ) : null}
      {display === 'dropdown' ? (
        <select
          className={s.input}
          aria-label={props.question}
          aria-invalid={error ? true : undefined}
          value={selected[0] ?? ''}
          onChange={event => choose(event.target.value)}
        >
          <option value="" disabled>
            Choose…
          </option>
          {options.map(option => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
          {props.other ? <option value="other">Other</option> : null}
        </select>
      ) : (
        <OptionGroup multiple={multiple} label={props.question} className={listClass}>
          {options.map(option => (
            <OptionButton
              key={option.id}
              multiple={multiple}
              checked={selected.includes(option.id)}
              className={cn(
                s.option,
                (display === 'buttons' || display === 'yesno') && s.optionPill,
                display === 'pictures' && s.optionPicture,
              )}
              onClick={() => choose(option.id)}
            >
              {display === 'pictures' && option.image ? (
                <img src={option.image} alt="" className={s.optionPictureImage} loading="lazy" />
              ) : null}
              {display === 'list' ? (
                <span className={cn(s.optionMark, multiple && s.optionMarkSquare)} aria-hidden="true" />
              ) : null}
              <span className={display === 'pictures' ? s.optionPictureLabel : undefined}>{option.label}</span>
            </OptionButton>
          ))}
          {props.other ? (
            <OptionButton
              multiple={multiple}
              checked={selected.includes('other')}
              className={cn(s.option, display === 'buttons' && s.optionPill)}
              onClick={() => choose('other')}
            >
              {display === 'list' ? (
                <span className={cn(s.optionMark, multiple && s.optionMarkSquare)} aria-hidden="true" />
              ) : null}
              <span>Other</span>
            </OptionButton>
          ) : null}
        </OptionGroup>
      )}
      {props.other && selected.includes('other') ? (
        <input
          className={s.input}
          aria-label="Other"
          maxLength={LIMITS.short_answer}
          value={otherText}
          onChange={event => runtime.setAnswer(otherKey, event.target.value)}
        />
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
