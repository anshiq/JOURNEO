export const VIEWPORTS = [
  { name: 'phone-s', width: 360, height: 740 },
  { name: 'phone-m', width: 390, height: 844 },
  { name: 'phone-l', width: 412, height: 915 },
  { name: 'tablet-p', width: 768, height: 1024 },
  { name: 'tablet-l', width: 820, height: 1180 },
  { name: 'laptop-s', width: 1024, height: 768 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1440, height: 900 },
] as const

export const TEMPLATES = ['lead-gen-launch', 'product-quiz', 'event-registration', 'feedback-nps']
export const RECIPES = [
  'welcome',
  'question',
  'picture-choice',
  'rating-nps',
  'lead-form',
  'product-picks',
  'offer-countdown',
  'coupon-reveal',
  'thank-you',
  'blank',
]
