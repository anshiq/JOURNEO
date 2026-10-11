import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const require = createRequire(new URL('frontend/package.json', root))
const { compile } = require('json-schema-to-typescript')
const Ajv2020 = require('ajv/dist/2020.js').default
const standaloneCode = require('ajv/dist/standalone/index.js').default

const read = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'))
const stripComments = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\n{3,}/g, '\n\n')

async function emit(path, content) {
  const url = new URL(path, root)
  await mkdir(dirname(fileURLToPath(url)), { recursive: true })
  await writeFile(url, `${stripComments(content).trim()}\n`)
}

const schema = await read('contracts/schema/journey-doc.v4.schema.json')
const clean = (value, drop, inDefs = false) => {
  if (Array.isArray(value)) return value.map(v => clean(v, drop))
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([k, v]) => !drop(k, inDefs, v))
      .map(([k, v]) => [k, k === '$defs' ? Object.fromEntries(Object.entries(v).map(([n, d]) => [n, clean(d, drop, true)])) : clean(v, drop)]),
  )
}
const forTypes = clean(
  schema,
  (key, inDefs, value) => key === 'discriminator' || (key === 'title' && !inDefs && typeof value === 'string'),
)
const forAjv = clean(schema, () => false)
const stripMapping = node => {
  if (Array.isArray(node)) return node.forEach(stripMapping)
  if (!node || typeof node !== 'object') return
  if (node.discriminator && typeof node.discriminator === 'object') delete node.discriminator.mapping
  Object.values(node).forEach(stripMapping)
}
stripMapping(forAjv)
const types = await compile(forTypes, 'JourneyDoc', {
  bannerComment: '',
  additionalProperties: false,
  unreachableDefinitions: true,
  format: false,
  ignoreMinAndMaxItems: true,
})
await emit('frontend/src/journey/model/doc.gen.ts', types)

const limits = await read('contracts/schema/limits.json')
await emit('frontend/src/shared/limits.gen.ts', `export const LIMITS = ${JSON.stringify(limits, null, 2)} as const\n`)

const ajv = new Ajv2020({ code: { source: true, esm: true }, discriminator: true, allErrors: true, strict: false })
ajv.addSchema(forAjv, 'doc')
await emit('frontend/src/editor/validation/validate-doc.gen.js', standaloneCode(ajv, { validateDoc: 'doc' }))

const output = fileURLToPath(new URL('frontend/src/shared/api/api.gen.d.ts', root))
execFileSync(
  'npx',
  ['--yes', '-p', 'openapi-typescript@7.13.0', '-p', 'typescript@5.9.3', 'openapi-typescript', 'contracts/openapi/api.json', '-o', output],
  { cwd: fileURLToPath(root), stdio: 'inherit' },
)
await emit('frontend/src/shared/api/api.gen.d.ts', await readFile(output, 'utf8'))
