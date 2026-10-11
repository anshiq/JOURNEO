import type { JourneyDoc } from '@journey/model/types'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { ScreenView } from './ScreenView'

function doc(elements: unknown[]): JourneyDoc {
  return {
    schemaVersion: 4,
    screens: { scr_aaaaaa: { id: 'scr_aaaaaa', name: 'A', elements: elements as never } },
    steps: [
      { id: 'stp_start0', kind: 'start' },
      { id: 'scr_aaaaaa', kind: 'screen' },
    ],
    links: { stp_start0: { next: 'scr_aaaaaa' } },
  }
}

const quiz = doc([
  {
    id: 'el_choice1',
    type: 'choice',
    props: {
      question: 'Budget?',
      key: 'budget',
      autoAdvance: true,
      options: [
        { id: 'opt_low001', label: 'Low' },
        { id: 'opt_high01', label: 'High' },
      ],
    },
  },
])

describe('ScreenView', () => {
  test('auto-advance exits with the chosen option id', () => {
    const onExit = vi.fn()
    render(
      <ScreenView doc={quiz} screenId="scr_aaaaaa" vars={{}} breakpoint="mobile" mode="test" isFirst onExit={onExit} />,
    )
    fireEvent.click(screen.getByRole('radio', { name: 'High' }))
    expect(onExit).toHaveBeenCalledWith('next', { budget: 'opt_high01' })
  })

  test('required questions block the next button', () => {
    const onExit = vi.fn()
    const d = doc([
      {
        id: 'el_choice1',
        type: 'choice',
        props: {
          question: 'Pick',
          key: 'pick',
          options: [
            { id: 'opt_aaa001', label: 'A' },
            { id: 'opt_bbb001', label: 'B' },
          ],
        },
      },
      {
        id: 'el_btn0001',
        type: 'buttons',
        props: {
          items: [
            { id: 'it_next001', label: 'Next', action: { kind: 'next' } },
            { id: 'it_skip001', label: 'Skip', action: { kind: 'goto', skipValidation: true } },
          ],
        },
      },
    ])
    render(
      <ScreenView doc={d} screenId="scr_aaaaaa" vars={{}} breakpoint="mobile" mode="test" isFirst onExit={onExit} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onExit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe('Please choose an option')
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(onExit).toHaveBeenCalledWith('el_btn0001:it_skip001', {})
  })

  test('forms validate locally, then use server field errors', async () => {
    const onExit = vi.fn()
    const onSubmit = vi.fn().mockResolvedValue({ ok: false, fields: { email: "You've already entered" } })
    const d = doc([
      {
        id: 'el_form001',
        type: 'form',
        props: {
          submitLabel: 'Send',
          fields: [{ id: 'fld_mail01', kind: 'email', label: 'Email', key: 'email', required: true }],
        },
      },
    ])
    render(
      <ScreenView
        doc={d}
        screenId="scr_aaaaaa"
        vars={{}}
        breakpoint="mobile"
        mode="live"
        isFirst
        onExit={onExit}
        onSubmit={onSubmit}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('This field is required')).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'ana@example.com' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    })
    expect(onSubmit).toHaveBeenCalledWith('el_form001', { email: 'ana@example.com', __hp: undefined })
    expect(screen.getByText("You've already entered")).toBeTruthy()
    expect(onExit).not.toHaveBeenCalled()
  })

  test('personalization and option labels render in text', () => {
    const d = doc([
      { id: 'el_head001', type: 'heading', props: { text: 'Hi {{first_name|there}}, you picked {{budget}}' } },
    ])
    d.screens = {
      ...d.screens,
      scr_bbbbbb: { id: 'scr_bbbbbb', name: 'B', elements: quiz.screens?.scr_aaaaaa?.elements ?? [] },
    }
    render(
      <ScreenView
        doc={d}
        screenId="scr_aaaaaa"
        vars={{ budget: 'opt_high01' }}
        breakpoint="mobile"
        mode="test"
        isFirst
        onExit={vi.fn()}
      />,
    )
    expect(screen.getByRole('heading').textContent).toBe('Hi there, you picked High')
  })

  test('every visible input has a max length', () => {
    const d = doc([
      {
        id: 'el_form001',
        type: 'form',
        props: {
          fields: ['name', 'email', 'phone', 'company', 'text', 'longtext', 'number', 'date'].map((kind, i) => ({
            id: `fld_${kind}`.padEnd(8, '0'),
            kind,
            label: `${kind} ${i}`,
            key: `${kind}_k`,
          })),
        },
      },
    ])
    const { container } = render(
      <ScreenView doc={d} screenId="scr_aaaaaa" vars={{}} breakpoint="mobile" mode="test" isFirst onExit={vi.fn()} />,
    )
    const fields = [
      ...container.querySelectorAll('input:not([type=checkbox]):not([type=number]):not([type=date]), textarea'),
    ]
    expect(fields.length).toBeGreaterThan(5)
    for (const field of fields) expect(Number(field.getAttribute('maxlength'))).toBeGreaterThan(0)
  })
})
