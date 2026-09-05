import { devLinkFor } from './devLink'

test('devLinkFor builds origin + /d/token', () => {
  const link = devLinkFor('abc-123')
  if (!link.endsWith('/d/abc-123')) throw new Error('devLink mismatch ' + link)
})

test('token is UUID like', () => {
  const token = crypto.randomUUID()
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRe.test(token)) throw new Error('not uuid')
})
