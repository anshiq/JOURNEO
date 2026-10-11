import type { ScreenLayout } from '@journey/model/types'
import { embedUrl } from '../elements/video'
import * as l from '../styles/layout.css'

export function Media({ media, eager }: { media: NonNullable<ScreenLayout['media']>; eager: boolean }) {
  const focal = media.focal ?? { x: 50, y: 50 }
  if (media.kind === 'video') {
    const source = media.src ?? ''
    const src = embedUrl(source.includes('vimeo') ? 'vimeo' : 'youtube', source, true, true)
    if (src)
      return (
        <iframe className={l.mediaImage} src={src} title={media.alt || 'Video'} allow="autoplay; encrypted-media" />
      )
    return <video className={l.mediaImage} src={media.src} autoPlay muted loop playsInline />
  }
  if (!media.src) return null
  return (
    <img
      className={l.mediaImage}
      src={media.src}
      srcSet={media.srcset ?? undefined}
      sizes="(min-width: 640px) 50vw, 100vw"
      alt={media.alt ?? ''}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      decoding="async"
      style={{ objectPosition: `${focal.x ?? 50}% ${focal.y ?? 50}%` }}
    />
  )
}
