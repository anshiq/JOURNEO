import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const dist = new URL('../frontend/dist/', import.meta.url)
const limit = Number(process.env.PLAYER_LIMIT_KB ?? 120) * 1024
const html = readFileSync(new URL('play.html', dist), 'utf8')
const files = [...new Set([...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map(match => match[1]))]
let total = 0
for (const file of files) {
  const size = gzipSync(readFileSync(new URL(file, dist))).length
  total += size
  console.log(`${(size / 1024).toFixed(1).padStart(7)} KB  ${file}`)
}
console.log(`${(total / 1024).toFixed(1).padStart(7)} KB  total (limit ${limit / 1024} KB)`)
if (total > limit) process.exit(1)
