export const REMOVED_TYPES = [
  'radio','toggle','slider','textarea','chip','icon','avatar','progress','file_uploader','tooltip','header','footer','dialog','sidebar','tabs','accordion','carousel_base','spacer','chat_bubble','product_card','profile_card','testimonial','pricing_card','stats_card','media_carousel','gallery','poll','newsletter','faq_section','timeline','progress_stepper','cta_section','comparison','chat_thread'
] as const
export type RemovedNodeType = typeof REMOVED_TYPES[number]
export const PRUNED_TYPE_MAP: Record<string, string> = {
  gallery: 'image',
  poll: 'quiz',
  media_carousel: 'image',
  stats_card: 'card',
  product_card: 'card',
  profile_card: 'card',
  testimonial: 'text',
  pricing_card: 'card',
  comparison: 'text',
  chat_thread: 'text',
  chat_bubble: 'text',
  carousel_base: 'image',
  progress: 'text',
  slider: 'text',
  radio: 'select',
  toggle: 'checkbox',
  chip: 'badge',
  icon: 'text',
  avatar: 'image',
  file_uploader: 'form',
  tooltip: 'text',
  header: 'text',
  footer: 'text',
  dialog: 'card',
  sidebar: 'container',
  tabs: 'container',
  accordion: 'text',
  spacer: 'divider',
  newsletter: 'form',
  faq_section: 'text',
  timeline: 'text',
  progress_stepper: 'text',
  cta_section: 'hero_section',
  textarea: 'input',
}
export function migratePrunedType(type: string): string {
  return PRUNED_TYPE_MAP[type] || 'text'
}
export function isPrunedType(type: string): boolean {
  return (REMOVED_TYPES as readonly string[]).includes(type)
}
