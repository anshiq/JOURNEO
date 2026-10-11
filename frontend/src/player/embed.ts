import type { JourneyDoc } from '@journey/model/types'

export interface EmbedLoad {
  type: 'jx:load'
  doc: JourneyDoc
  startAt?: string
  device?: 'mobile' | 'tablet' | 'desktop'
}

export function listenForDoc(onLoad: (message: EmbedLoad) => void): () => void {
  const handler = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return
    const data = event.data as { type?: string } | null
    if (data?.type === 'jx:load') onLoad(data as EmbedLoad)
  }
  window.addEventListener('message', handler)
  window.parent?.postMessage({ type: 'jx:ready' }, window.location.origin)
  return () => window.removeEventListener('message', handler)
}

export function postStep(info: unknown): void {
  if (window.parent && window.parent !== window)
    window.parent.postMessage({ type: 'jx:step', info }, window.location.origin)
}
