import { triggerDefinition } from '../trigger'
import { conditionDefinition } from '../condition'
import { endDefinition } from '../end'
import { textDefinition } from '../text'
import { imageDefinition } from '../image'
import { videoDefinition } from '../video'
import { buttonDefinition } from '../button'
import { inputDefinition } from '../input'
import { selectDefinition } from '../select'
import { checkboxDefinition } from '../checkbox'
import { ratingDefinition } from '../rating'
import { containerDefinition } from '../container'
import { dividerDefinition } from '../divider'
import { cardDefinition } from '../card'
import { heroSectionDefinition } from '../hero_section'
import { quizDefinition } from '../quiz'
import { formDefinition } from '../form'
import { countdownDefinition } from '../countdown'
import { alertDefinition } from '../alert'
import { badgeDefinition } from '../badge'

export const nodeRegistry = {
  trigger: triggerDefinition,
  condition: conditionDefinition,
  end: endDefinition,
  text: textDefinition,
  image: imageDefinition,
  video: videoDefinition,
  button: buttonDefinition,
  input: inputDefinition,
  select: selectDefinition,
  checkbox: checkboxDefinition,
  rating: ratingDefinition,
  container: containerDefinition,
  divider: dividerDefinition,
  card: cardDefinition,
  hero_section: heroSectionDefinition,
  quiz: quizDefinition,
  form: formDefinition,
  countdown: countdownDefinition,
  alert: alertDefinition,
  badge: badgeDefinition,
} as const

export type RegistryType = typeof nodeRegistry
export type NodeType = keyof RegistryType
export const allNodeTypes = Object.keys(nodeRegistry) as NodeType[]
export const nodeCategories: Record<string, NodeType[]> = {
  'Flow': ['trigger','condition','end'],
  'Content': ['text','image','video','badge','alert'],
  'Form': ['button','input','select','checkbox','rating'],
  'Layout': ['container','divider'],
  'Display': ['card','hero_section'],
  'Interactive': ['quiz','form','countdown'],
}
export const nodeInfo: Record<NodeType, string> = {
  trigger: 'Journey entry point',
  condition: 'Conditional branching',
  end: 'Journey end',
  text: 'Rich text block',
  image: 'Image display',
  video: 'Video player',
  button: 'Clickable button',
  input: 'Text input field',
  select: 'Dropdown select',
  checkbox: 'Checkbox input',
  rating: 'Star rating',
  container: 'Layout container',
  divider: 'Separator line',
  card: 'Content card',
  hero_section: 'Hero banner',
  quiz: 'Quiz form',
  form: 'Data form',
  countdown: 'Countdown timer',
  alert: 'Alert notification',
  badge: 'Label tag',
}
export const branchCapableNodeTypes: NodeType[] = ['condition','quiz','video']
export function getDefinition(type: string) { return (nodeRegistry as any)[type] }
export function getSchema(type: string) { return (nodeRegistry as any)[type]?.schema }
export function getDefaultConfig(type: string) { return (nodeRegistry as any)[type]?.defaultConfig }
export function getDevice(type: string) { return (nodeRegistry as any)[type]?.Device }
export function getJourneyConfig(type: string) { return (nodeRegistry as any)[type]?.JourneyConfig }
export function getStyleConfig(type: string) { return (nodeRegistry as any)[type]?.StyleConfig }
export { styleSchema, type NodeStyle } from './types'

export const defaultConfigFor = getDefaultConfig
export { validateNodeConfig } from './helpers'
