import type { Preview } from '@storybook/react-vite'
import '../src/index.css'
import { DEVICE_VIEWPORTS } from '../src/lib/viewports'

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    viewport: {
      options: DEVICE_VIEWPORTS,
    },
    initialGlobals: {
      viewport: { value: 'iphone14', isRotated: false },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },
}

export default preview
