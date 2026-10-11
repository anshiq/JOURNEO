import type { JourneyDoc as GeneratedDoc } from './doc.gen'

export type * from './doc.gen'
export type JourneyDoc = GeneratedDoc
export type Step = NonNullable<GeneratedDoc['steps']>[number]
export type Screen = NonNullable<GeneratedDoc['screens']>[string]
export type Element = NonNullable<Screen['elements']>[number]
export type ElementType = Element['type']
