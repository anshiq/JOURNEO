import { useEffect } from 'react'
import mitt from 'mitt'
import type { Events } from './events'
export const bus = mitt<Events>()
export function useEvent<K extends keyof Events>(type: K, handler: (payload: Events[K]) => void) {
  useEffect(() => {
    const h = handler as any
    bus.on(type, h)
    return () => { bus.off(type, h) }
  }, [type, handler])
}
