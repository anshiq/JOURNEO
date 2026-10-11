import { useState } from 'react'
import { cn } from '../classnames'
import { useRuntime } from '../render/runtime'
import * as s from '../styles/elements.css'
import type { ElementOf, ElementProps } from './types'

export function embedUrl(kind: string, url: string, autoplay: boolean, loop: boolean): string | null {
  try {
    const parsed = new URL(url)
    if (kind === 'youtube') {
      const id = parsed.hostname.includes('youtu.be')
        ? parsed.pathname.slice(1)
        : (parsed.searchParams.get('v') ?? parsed.pathname.split('/').filter(Boolean).pop() ?? '')
      if (!/^[\w-]{6,20}$/.test(id)) return null
      const params = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' })
      if (autoplay) {
        params.set('autoplay', '1')
        params.set('mute', '1')
      }
      if (loop) {
        params.set('loop', '1')
        params.set('playlist', id)
      }
      return `https://www.youtube-nocookie.com/embed/${id}?${params}`
    }
    if (kind === 'vimeo') {
      const id = parsed.pathname
        .split('/')
        .filter(Boolean)
        .find(part => /^\d+$/.test(part))
      if (!id) return null
      const params = new URLSearchParams({ dnt: '1' })
      if (autoplay) {
        params.set('autoplay', '1')
        params.set('muted', '1')
      }
      if (loop) params.set('loop', '1')
      return `https://player.vimeo.com/video/${id}?${params}`
    }
  } catch {
    return null
  }
  return null
}

export function Video({ element, style }: ElementProps<ElementOf<'video'>>) {
  const runtime = useRuntime()
  const { source, poster, autoplay = false, loop = false, aspect = '16:9' } = element.props
  const [started, setStarted] = useState(autoplay)
  const frame = cn(s.video, s.imageAspect[aspect], style.radius ? s.radius[style.radius] : undefined)
  if (source.kind === 'file') {
    return (
      <div className={frame}>
        <video
          className={s.videoFrame}
          src={source.url}
          poster={poster ?? undefined}
          controls
          playsInline
          muted={autoplay}
          autoPlay={autoplay && runtime.mode === 'live'}
          loop={loop}
          preload="metadata"
        />
      </div>
    )
  }
  const src = embedUrl(source.kind, source.url, autoplay || started, loop)
  if (!src) return <div className={frame} />
  if (runtime.mode === 'thumbnail' || runtime.mode === 'edit' || (!started && poster)) {
    return (
      <button
        type="button"
        className={cn(frame, s.tap)}
        style={{ width: '100%' }}
        onClick={() => setStarted(true)}
        aria-label="Play video"
      >
        {poster ? <img src={poster} alt="" className={s.imageFill} /> : null}
        <span
          style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 48, color: '#fff' }}
        >
          ▶
        </span>
      </button>
    )
  }
  return (
    <div className={frame}>
      <iframe
        className={s.videoFrame}
        src={src}
        title="Video"
        loading="lazy"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  )
}
