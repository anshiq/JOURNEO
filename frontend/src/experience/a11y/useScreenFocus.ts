import { type RefObject, useEffect } from 'react'

export function useScreenFocus(ref: RefObject<HTMLElement | null>, key: string, enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !key) return
    const node = ref.current?.querySelector<HTMLElement>('[data-screen-heading]')
    node?.focus({ preventScroll: true })
    ref.current?.scrollIntoView?.({ block: 'start' })
  }, [ref, key, enabled])
}
