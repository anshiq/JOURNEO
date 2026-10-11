import { customAlphabet } from 'nanoid'

export type IdKind = 'scr' | 'stp' | 'el' | 'it' | 'opt' | 'fld' | 'band' | 'rule'
export type IdGen = (kind: IdKind) => string

export const ID_PATTERN = /^[a-z][a-z0-9_-]{5,20}$/

const body = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10)

export function isValidId(value: string): boolean {
  return ID_PATTERN.test(value)
}

export const randomIds: IdGen = kind => `${kind}_${body()}`

export function sequentialIds(seed = 0): IdGen {
  let n = seed
  return kind => `${kind}_${(++n).toString(36).padStart(10, '0')}`
}
