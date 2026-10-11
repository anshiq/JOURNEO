import { ErrorBoundary, ErrorNotice } from '@shared/ErrorBoundary'
import { strings } from '@shared/strings'
import { initTelemetry } from '@shared/telemetry'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PlayerApp } from './App'

initTelemetry()
const root = document.getElementById('jx-player')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary
        context="player"
        fallback={() => (
          <ErrorNotice fill action={{ label: strings.reload, onClick: () => window.location.reload() }} />
        )}
      >
        <PlayerApp />
      </ErrorBoundary>
    </StrictMode>,
  )
}
