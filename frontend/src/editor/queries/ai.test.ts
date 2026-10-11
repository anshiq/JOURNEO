import { ProblemError } from '@shared/api/problem'
import { describe, expect, test } from 'vitest'
import { aiFailureMessage } from './ai'

function problem(status: number, detail = 'Something else') {
  return new ProblemError({ status, code: 'test', title: 'Test', detail })
}

describe('aiFailureMessage', () => {
  test('maps a missing model to the setup message', () => {
    expect(aiFailureMessage(problem(503), 'fallback')).toBe('AI is not set up')
  })

  test('maps an upstream rate limit to the busy message', () => {
    expect(aiFailureMessage(problem(429), 'fallback')).toBe('AI is busy. Try again in a moment.')
  })

  test('keeps the server detail for other problems', () => {
    expect(aiFailureMessage(problem(422, 'Enter a valid web address'), 'fallback')).toBe('Enter a valid web address')
  })

  test('uses the fallback for unknown failures', () => {
    expect(aiFailureMessage(new Error('network'), 'fallback')).toBe('fallback')
  })
})
