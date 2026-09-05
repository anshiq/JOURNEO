import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DEFAULT_VIEWPORT, isViewportId, type ViewportId } from './viewports'
export function getViewportForWidth(w: number): ViewportId {
  if (w < 480) return 'iphone14'
  if (w < 700) return 'pixel7'
  if (w < 1100) return 'ipadAir'
  return 'desktopHD'
}
export function useViewport() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [viewportId, setViewportIdInternal] = useState<ViewportId>(() => {
    const qp = searchParams.get('viewport')
    if (isViewportId(qp)) return qp
    if (typeof window !== 'undefined') return getViewportForWidth(window.innerWidth)
    return DEFAULT_VIEWPORT
  })
  const setViewportId = useCallback((id: ViewportId) => {
    setViewportIdInternal(id)
    setSearchParams(prev => {
      const n = new URLSearchParams(prev)
      if (n.get('viewport') !== id) {
        n.set('viewport', id)
        return n
      }
      return prev
    }, { replace: true })
  }, [setSearchParams])
  useEffect(() => {
    const qp = searchParams.get('viewport')
    if (isViewportId(qp) && qp !== viewportId) setViewportIdInternal(qp)
  }, [searchParams, viewportId])
  useEffect(() => {
    if (isViewportId(searchParams.get('viewport'))) return
    const onResize = () => setViewportId(getViewportForWidth(window.innerWidth))
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [searchParams, setViewportId])
  return { viewportId, setViewportId, searchParams, setSearchParams }
}
export function useLiveViewport(override?: string | null): ViewportId {
  const [viewportId, setViewportId] = useState<ViewportId>(() => {
    if (isViewportId(override)) return override
    if (typeof window !== 'undefined') return getViewportForWidth(window.innerWidth)
    return DEFAULT_VIEWPORT
  })
  useEffect(() => {
    if (isViewportId(override)) { setViewportId(override); return }
    const onResize = () => setViewportId(getViewportForWidth(window.innerWidth))
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [override])
  return viewportId
}
