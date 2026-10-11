import { useEffect, useState } from 'react'

export function useOtherTabs(campaignId: string): boolean {
  const [others, setOthers] = useState(false)
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel(`journeo:${campaignId}`)
    const id = Math.random().toString(36).slice(2)
    channel.onmessage = event => {
      const data = event.data as { type: string; id: string }
      if (data.id === id) return
      if (data.type === 'hello') channel.postMessage({ type: 'here', id })
      if (data.type === 'hello' || data.type === 'here') setOthers(true)
      if (data.type === 'bye') setOthers(false)
    }
    channel.postMessage({ type: 'hello', id })
    return () => {
      channel.postMessage({ type: 'bye', id })
      channel.close()
    }
  }, [campaignId])
  return others
}
