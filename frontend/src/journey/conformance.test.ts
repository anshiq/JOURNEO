import { describe, expect, test } from 'vitest'
import { back, exit, start, type Vars } from './engine/index'
import type { JourneyDoc } from './model/types'
import { portsOf, screenOutputs } from './ports'

interface RunInput {
  at?: string
  port?: string
  answers?: Vars
  back?: boolean
}

interface RunExpectation {
  inputs: RunInput[]
  path: string[]
  status: string
  matched?: string
  redirect?: string
  error?: string
  system?: Vars
}

interface CaseFile {
  doc: JourneyDoc
  expect: {
    ports: Record<string, string[]>
    outputs: Record<string, { key: string; type: string }[]>
    issues: unknown[]
    runs?: RunExpectation[]
  }
}

const cases = import.meta.glob<CaseFile>('../../../contracts/conformance/*.json', { eager: true, import: 'default' })

function portsMap(doc: JourneyDoc): Record<string, string[]> {
  return Object.fromEntries((doc.steps ?? []).map(step => [step.id, portsOf(doc, step.id).map(port => port.port)]))
}

function outputsMap(doc: JourneyDoc): Record<string, { key: string; type: string }[]> {
  return Object.fromEntries(
    Object.entries(doc.screens ?? {}).map(([screenId, screen]) => [
      screenId,
      screenOutputs(screen).map(output => ({ key: output.key, type: output.type })),
    ]),
  )
}

function simulate(
  doc: JourneyDoc,
  run: RunExpectation,
): {
  path: string[]
  status: string
  matched: string | undefined
  redirect: string | undefined
  error: string | undefined
} {
  let state = start(doc, { system: run.system ?? {} }).state
  const path = state.stack.map(frame => frame.stepId)
  let matched: string | undefined
  let error: string | undefined
  for (const input of run.inputs) {
    if (input.back === true) {
      state = back(state)
    } else {
      const top = state.stack[state.stack.length - 1]
      expect(top?.stepId).toBe(input.at)
      const transition = exit(doc, state, input.port ?? 'next', input.answers ?? {})
      state = transition.state
      if (transition.matched) matched = transition.matched.ruleId
      for (const event of transition.events) {
        if (event.type === 'engine_error') error = event.reason
      }
    }
    const current = state.stack[state.stack.length - 1]
    if (state.status === 'running' && current) path.push(current.stepId)
  }
  if (state.status === 'redirect') {
    return { path, status: 'redirect', matched, redirect: state.redirect?.url, error }
  }
  if (state.status === 'ended') return { path, status: 'ended', matched, redirect: undefined, error }
  const top = state.stack[state.stack.length - 1]
  const terminal = top ? portsOf(doc, top.stepId).length === 0 : true
  return { path, status: terminal ? 'ended' : 'running', matched, redirect: undefined, error }
}

describe.each(Object.entries(cases))('%s', (_file, c) => {
  test('ports', () => {
    expect(portsMap(c.doc)).toEqual(c.expect.ports)
  })
  test('outputs', () => {
    expect(outputsMap(c.doc)).toEqual(c.expect.outputs)
  })
  test.each(c.expect.runs ?? [])('run $path', run => {
    const actual = simulate(c.doc, run)
    expect(actual.path).toEqual(run.path)
    expect(actual.status).toEqual(run.status)
    if (run.matched !== undefined) expect(actual.matched).toEqual(run.matched)
    if (run.redirect !== undefined) expect(actual.redirect).toEqual(run.redirect)
    if (run.error !== undefined) expect(actual.error).toEqual(run.error)
  })
})
