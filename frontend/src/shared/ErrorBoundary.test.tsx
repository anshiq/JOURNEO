import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'
import { reportError } from './telemetry'

vi.mock('./telemetry', () => ({ reportError: vi.fn() }))

let broken = true

function Flaky() {
  if (broken) throw new Error('boom')
  return <p>Recovered view</p>
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    cleanup()
    broken = true
    vi.restoreAllMocks()
  })

  test('renders children when nothing fails', () => {
    broken = false
    render(
      <ErrorBoundary context="test">
        <p>Healthy</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('Healthy')).toBeTruthy()
  })

  test('shows a recoverable fallback and reports the error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(
      <ErrorBoundary context="tab:chat">
        <Flaky />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert').textContent).toContain('Something went wrong.')
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ context: 'tab:chat' }))
    broken = false
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.getByText('Recovered view')).toBeTruthy()
  })
})
