import type { Element } from '@journey/model/types'
import { Buttons } from './buttons'
import { Cards } from './cards'
import { Choice } from './choice'
import { Countdown } from './countdown'
import { Form } from './form'
import { Heading } from './heading'
import { Image } from './image'
import { Rating } from './rating'
import { Spacer } from './spacer'
import { Text } from './text'
import type { ElementComponent, ElementOf } from './types'
import { Video } from './video'

export type Registry = { [T in Element['type']]: ElementComponent<ElementOf<T>> }

export const registry: Registry = {
  heading: Heading,
  text: Text,
  image: Image,
  video: Video,
  buttons: Buttons,
  cards: Cards,
  countdown: Countdown,
  spacer: Spacer,
  choice: Choice,
  rating: Rating,
  form: Form,
}
