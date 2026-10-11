import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PlayerApp } from './App'

const root = document.getElementById('jx-player')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <PlayerApp />
    </StrictMode>,
  )
}
