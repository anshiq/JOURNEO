import { describe, expect, it } from 'vitest'
import { safeMinWidth, safeWidth, withAdGuard } from './responsive'
import { applyStyle } from './preview'

describe('responsive guards', () => {
  it('clamps fixed px widths to the container', () => {
    expect(safeWidth('900px')).toBe('min(900px, 100%)')
    expect(safeWidth('100%')).toBe('100%')
    expect(safeWidth('140%')).toBe('100%')
    expect(safeWidth('50vw')).toBe('min(50vw, 100%)')
    expect(safeWidth('')).toBeUndefined()
  })
  it('clamps min-width so it can never force overflow', () => {
    expect(safeMinWidth('900px')).toBe('min(900px, 100%)')
    expect(safeMinWidth('auto')).toBeUndefined()
    expect(safeMinWidth('')).toBeUndefined()
  })
  it('ad guard always caps at container width', () => {
    const out = withAdGuard({ width: '900px' })
    expect(out.maxWidth).toBe('100%')
    expect(out.minWidth).toBe(0)
  })
  it('applyStyle caps designer widths and neutralises fixed positioning', () => {
    const out = applyStyle({ width: '1200px', position: 'fixed' } as any)
    expect(out.width).toBe('min(1200px, 100%)')
    expect(out.maxWidth).toBe('100%')
    expect(out.position).toBe('relative')
    expect(out.minWidth).toBe(0)
  })
})
