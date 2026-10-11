import { readFile } from 'node:fs/promises'
import { globSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(new URL('../frontend/package.json', import.meta.url))
const { parseSync } = require('oxc-parser')

const root = new URL('../', import.meta.url).pathname
process.chdir(root)
const files = globSync('frontend/src/**/*.{ts,tsx,js,mjs}', { exclude: f => f.includes('node_modules') }).filter(
  f => !f.endsWith('.gen.js'),
)
const editableAllowed = [/src\/editor\/canvas\/InlineText\.tsx$/]
const exempt = new Set(['color', 'file', 'number', 'date', 'datetime-local', 'time', 'checkbox', 'radio', 'range', 'hidden'])
const problems = []

function attr(node, name) {
  return node.attributes.find(a => a.type === 'JSXAttribute' && a.name?.name === name)
}

function walk(node, visit) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit)
    return
  }
  if (typeof node.type === 'string') visit(node)
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue
    const value = node[key]
    if (value && typeof value === 'object') walk(value, visit)
  }
}

for (const file of files) {
  const source = await readFile(file, 'utf8')
  const result = parseSync(file, source, { sourceType: 'module' })
  const line = offset => source.slice(0, offset).split('\n').length
  for (const c of result.comments) problems.push(`${file}:${line(c.start)} comment`)
  walk(result.program, node => {
    if (node.type !== 'JSXOpeningElement' || node.name?.type !== 'JSXIdentifier') return
    const tag = node.name.name
    if (attr(node, 'contentEditable') && !editableAllowed.some(r => r.test(file)))
      problems.push(`${file}:${line(node.start)} contentEditable outside the inline editor`)
    if (tag !== 'input' && tag !== 'textarea') return
    const type = attr(node, 'type')
    const value = type?.value?.type === 'Literal' || type?.value?.type === 'StringLiteral' ? type.value.value : 'text'
    if (tag === 'input' && exempt.has(value)) return
    if (!attr(node, 'maxLength')) problems.push(`${file}:${line(node.start)} <${tag}> without maxLength`)
  })
}

for (const file of globSync('frontend/{index,play}.html')) if ((await readFile(file, 'utf8')).includes('<!--')) problems.push(`${file} html comment`)
if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}
