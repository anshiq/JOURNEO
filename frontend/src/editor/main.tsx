import './index.css'
import { initTelemetry } from '@shared/telemetry'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { Providers } from './providers'

initTelemetry()
const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Providers>
        <App />
      </Providers>
    </StrictMode>,
  )
}
