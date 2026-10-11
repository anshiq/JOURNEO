import { describe, expect, test } from 'vitest'
import { ID_PATTERN, isValidId, randomIds, sequentialIds } from './ids'

describe('ids', () => {
  test('pattern accepts prefixed ids', () => {
    for (const id of ['scr_abc123', 'stp_0000000001', 'el_a-b_c9', 'opt_zzzzzzzzzz']) {
      expect(ID_PATTERN.test(id)).toBe(true)
      expect(isValidId(id)).toBe(true)
    }
  })
  test('pattern rejects malformed ids', () => {
    for (const id of ['', 'ABCDEF', '1abcde', 'ab', 'a_very_long_identifier_over_twenty', 'el_ABC']) {
      expect(isValidId(id)).toBe(false)
    }
  })
  test('sequential ids are deterministic and padded', () => {
    const first = sequentialIds()
    const second = sequentialIds()
    expect(first('scr')).toBe('scr_0000000001')
    expect(first('el')).toBe('el_0000000002')
    expect(second('scr')).toBe('scr_0000000001')
    expect(sequentialIds(35)('it')).toBe('it_0000000010')
  })
  test('random ids carry the kind prefix and validate', () => {
    const ids = new Set(Array.from({ length: 50 }, () => randomIds('opt')))
    expect(ids.size).toBe(50)
    for (const id of ids) {
      expect(id.startsWith('opt_')).toBe(true)
      expect(isValidId(id)).toBe(true)
    }
  })
})
