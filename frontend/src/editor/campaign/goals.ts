import type { Goal } from '../queries/types'

export const GOALS: { value: Goal; label: string; hint: string }[] = [
  { value: 'leads', label: 'Collect leads', hint: 'Capture names and emails' },
  { value: 'recommend', label: 'Recommend a product', hint: 'Quiz that suggests the right pick' },
  { value: 'giveaway', label: 'Giveaway', hint: 'Enter to win' },
  { value: 'event', label: 'Event or webinar sign-up', hint: 'Register and add to calendar' },
  { value: 'feedback', label: 'Feedback or score', hint: 'Ask how likely they are to recommend you' },
  { value: 'offer', label: 'Reveal an offer', hint: 'Unlock a discount code' },
  { value: 'waitlist', label: 'Waitlist', hint: 'Join before launch' },
]

export const BRIEF_EXAMPLES = [
  'Spring sale on our running shoes, 20% off for newsletter sign-ups',
  'Free 30-minute consultation for small business owners',
  'Quiz to find the right skincare routine',
]
