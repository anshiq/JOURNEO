import type { JourneyDoc } from '@journey/model/types'

type Loader = () => Promise<unknown>

const templates = import.meta.glob('../../../contracts/library/templates/*.json', { import: 'default' }) as Record<
  string,
  Loader
>
const recipes = import.meta.glob('../../../contracts/library/recipes/*.json', { import: 'default' }) as Record<
  string,
  Loader
>
const cases = import.meta.glob('../../../contracts/conformance/*.json', { import: 'default' }) as Record<string, Loader>

function find(loaders: Record<string, Loader>, name: string): Loader | undefined {
  return Object.entries(loaders).find(([path]) => path.endsWith(`/${name}.json`))?.[1]
}

let counter = 0
const nextId = (kind: string) => `${kind}_fx${(++counter).toString(36).padStart(8, '0')}`

function instantiate(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(instantiate)
  if (!value || typeof value !== 'object') return value
  const out: Record<string, unknown> = {}
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) out[key] = instantiate(inner)
  if ('type' in out && 'props' in out && !('id' in out)) out.id = nextId('el')
  if ('label' in out && !('id' in out) && !('type' in out) && !('kind' in out)) out.id = nextId('it')
  if ('kind' in out && 'key' in out && !('id' in out)) out.id = nextId('fld')
  if ('title' in out && !('id' in out) && !('type' in out) && !('kind' in out)) out.id = nextId('it')
  return out
}

function recipeDoc(recipe: {
  name?: string
  layout?: unknown
  elements?: unknown[]
  stickyAction?: boolean
}): JourneyDoc {
  const screenId = 'scr_fixture1'
  const elements = (instantiate(recipe.elements ?? []) as Record<string, unknown>[]).map(el => {
    const props = el.props as Record<string, unknown>
    if (el.type === 'choice' && !props.key) props.key = 'answer'
    if (el.type === 'rating' && !props.key) props.key = 'score'
    return el
  })
  return {
    schemaVersion: 4,
    screens: {
      [screenId]: {
        id: screenId,
        name: recipe.name ?? 'Fixture',
        layout: recipe.layout as never,
        elements: elements as never,
        stickyAction: recipe.stickyAction ?? false,
      },
    },
    steps: [
      { id: 'stp_fixture', kind: 'start' },
      { id: screenId, kind: 'screen' },
    ],
    links: { stp_fixture: { next: screenId } },
  }
}

export async function loadFixture(spec: string): Promise<JourneyDoc | null> {
  const [kind, name = ''] = spec.split(':')
  if (kind === 'template') {
    const loader = find(templates, name)
    return loader ? ((await loader()) as { doc: JourneyDoc }).doc : null
  }
  if (kind === 'recipe') {
    const loader = find(recipes, name)
    return loader ? recipeDoc((await loader()) as Parameters<typeof recipeDoc>[0]) : null
  }
  if (kind === 'case') {
    const loader = find(cases, name)
    return loader ? ((await loader()) as { doc: JourneyDoc }).doc : null
  }
  return null
}

export function fixtureNames(): string[] {
  const names = (loaders: Record<string, Loader>, kind: string) =>
    Object.keys(loaders).map(path => `${kind}:${path.split('/').pop()?.replace('.json', '')}`)
  return [...names(templates, 'template'), ...names(recipes, 'recipe')]
}
