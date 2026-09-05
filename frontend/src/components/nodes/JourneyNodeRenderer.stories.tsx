import type { Meta, StoryObj } from '@storybook/react-vite'
import { ReactFlowProvider } from 'reactflow'
import 'reactflow/dist/style.css'
import JourneyNodeRenderer from './JourneyNodeRenderer'
import { defaultConfigFor, type NodeType } from '../../lib/nodeSchemas'

function Frame({ type, config, hasError }: { type: NodeType; config?: any; hasError?: boolean }) {
  return (
    <ReactFlowProvider>
      <div style={{ padding: 40, background: '#f8fafc', minHeight: '100%' }}>
        <JourneyNodeRenderer
          id="preview" type="journeyNode" selected={false} dragging={false}
          zIndex={0} isConnectable xPos={0} yPos={0}
          data={{ type, config: config ?? defaultConfigFor(type), hasError }}
        />
      </div>
    </ReactFlowProvider>
  )
}

const meta: Meta<typeof Frame> = {
  title: 'Journey Nodes/All Types',
  component: Frame,
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj<typeof Frame>

export const Trigger: Story = { args: { type: 'trigger' } }
export const Condition: Story = { args: { type: 'condition', config: { field: 'user_interest', operator: 'eq', value: 'sneakerhead' } } }
export const End: Story = { args: { type: 'end' } }

export const HeroSection: Story = {
  args: {
    type: 'hero_section',
    config: {
      badge: 'Just Dropped',
      headline: 'Nike Air Max Dn',
      subheadline: 'Feel the unreal. Dual-pressure Air units.',
      image: 'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=800&q=80',
      imagePosition: 'right',
      ctas: [{ label: 'Shop Now', variant: 'solid' }],
    },
  },
}
export const Video: Story = {
  args: {
    type: 'video',
    config: { url: 'https://www.youtube.com/watch?v=XsO3CFF0O5o', poster: 'https://i.ytimg.com/vi/XsO3CFF0O5o/hqdefault.jpg', controls: true },
  },
}
export const MediaCarousel: Story = {
  args: {
    type: 'card' as any,
    config: {
      items: [
        { id: '1', image: { src: 'https://images.unsplash.com/photo-1747691875590-14db938e42d4?w=400&q=80', alt: 'Side Profile' }, title: 'Side Profile' },
        { id: '2', image: { src: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=400&q=80', alt: 'Sole Detail' }, title: 'Sole Detail' },
        { id: '3', image: { src: 'https://images.unsplash.com/photo-1662410945107-e3e6927e828d?w=400&q=80', alt: 'On Foot' }, title: 'On Foot' },
      ],
      aspectRatio: '16/9',
      showCaptions: true,
    },
  },
}
export const Text: Story = {
  args: { type: 'text', config: { content: 'Introducing Nike Air Max Dn. Feel the unreal.' } },
}
export const Image: Story = {
  args: { type: 'image', config: { src: 'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=800&q=80', alt: 'Nike Air Max Dn' } },
}
export const Button: Story = {
  args: { type: 'button', config: { label: 'Shop Now', variant: 'solid', size: 'md' } },
}
export const Quiz: Story = {
  args: {
    type: 'quiz',
    config: {
      question: 'Which Air Max Dn colorway speaks to you?',
      type: 'mcq',
      options: [{ id: 'a', label: 'Black/Anthracite' }, { id: 'b', label: 'White/Volt' }, { id: 'c', label: 'University Red' }],
    },
  },
}
export const Poll: Story = {
  args: {
    type: 'quiz' as any,
    config: {
      question: 'Which feature matters most to you?',
      options: [{ id: '1', label: 'Comfort' }, { id: '2', label: 'Style' }, { id: '3', label: 'Performance' }],
    },
  },
}
export const Slider: Story = {
  args: { type: 'rating' as any, config: { label: 'How likely are you to cop?', min: 1, max: 10, value: 5 } },
}
export const Form: Story = {
  args: {
    type: 'form',
    config: {
      fields: [
        { id: 'email', type: 'input', label: 'Email', placeholder: 'your@email.com', required: true },
        { id: 'size', type: 'select', label: 'Size', options: [{ value: '9', label: '9' }, { value: '10', label: '10' }] },
      ],
      submitLabel: 'Get Early Access',
    },
  },
}
export const Countdown: Story = {
  args: { type: 'countdown', config: { endTime: new Date(Date.now() + 5 * 86400000).toISOString(), label: 'Launch in', size: 'md' } },
}
export const ChatBubble: Story = {
  args: { type: 'text' as any, config: { message: 'You\'re on the list! We\'ll notify you.', sender: 'bot' } },
}
export const Card: Story = {
  args: {
    type: 'card',
    config: {
      layout: 'vertical',
      title: 'Nike Air Max Dn',
      description: 'Feel the unreal.',
      actions: [{ label: 'Shop Now', variant: 'solid' }],
    },
  },
}
export const ProductCard: Story = {
  args: {
    type: 'card' as any,
    config: {
      image: { src: 'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=400&q=80' },
      title: 'Nike Air Max Dn',
      price: { current: 189, currency: '$' },
      rating: { value: 4.5, count: 128 },
    },
  },
}
export const Newsletter: Story = {
  args: {
    type: 'form' as any,
    config: { headline: 'Stay Updated', description: 'Get the latest drops', placeholder: 'Enter your email', buttonLabel: 'Subscribe' },
  },
}
