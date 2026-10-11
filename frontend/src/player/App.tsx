import { useEffect, useState } from 'react'
import { fetchDev, fetchLive } from './api'
import { listenForDoc, postStep } from './embed'
import { loadFixture } from './fixtures'
import { EndedCard, Player, type PlayerMode } from './Player'
import { type PlayerPayload, readInlinePayload } from './payload'
import * as ui from './player.css'

interface Route {
  mode: PlayerMode
  slug?: string
  token?: string
  fixture?: string
  screen?: string
}

export function route(location: Location): Route {
  const query = new URLSearchParams(location.search)
  const screen = query.get('screen') ?? undefined
  if (query.get('embed') === '1') return { mode: 'embed', ...(screen ? { screen } : {}) }
  const fixture = query.get('fixture')
  if (fixture) return { mode: 'fixture', fixture, ...(screen ? { screen } : {}) }
  const dev = location.pathname.match(/^\/d\/([^/]+)/)
  if (dev?.[1]) return { mode: 'test', token: decodeURIComponent(dev[1]) }
  const live = location.pathname.match(/^\/c\/([^/]+)/)
  return { mode: 'live', slug: live?.[1] ? decodeURIComponent(live[1]) : '' }
}

export function PlayerApp() {
  const [where] = useState(() => route(window.location))
  const [payload, setPayload] = useState<PlayerPayload | null>(() =>
    where.mode === 'live' ? readInlinePayload() : null,
  )
  const [error, setError] = useState<string | null>(null)
  const [startAt, setStartAt] = useState<string | undefined>(where.screen)
  const [update, setUpdate] = useState<PlayerPayload | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (where.mode === 'live' && !payload && where.slug) {
      fetchLive(where.slug)
        .then(setPayload)
        .catch(() => setPayload({ mode: 'live', doc: null, notFound: true }))
    }
  }, [where, payload])

  useEffect(() => {
    if (where.mode !== 'test' || !where.token) return
    const token = where.token
    let etag: string | undefined
    let stopped = false
    const poll = async (first: boolean) => {
      try {
        const result = await fetchDev(token, etag)
        if (result.etag) etag = result.etag
        if (result.payload) {
          if (first) setPayload(result.payload)
          else setUpdate(result.payload)
        }
      } catch {
        if (first) setError('This preview link is no longer valid.')
      }
      if (!stopped) window.setTimeout(() => void poll(false), 3000)
    }
    void poll(true)
    return () => {
      stopped = true
    }
  }, [where])

  useEffect(() => {
    if (where.mode === 'fixture' && where.fixture) {
      loadFixture(where.fixture)
        .then(doc => (doc ? setPayload({ mode: 'test', doc }) : setError(`Unknown fixture ${where.fixture}`)))
        .catch(() => setError('Fixture failed to load'))
    }
  }, [where])

  useEffect(() => {
    if (where.mode !== 'embed') return
    return listenForDoc(message => {
      setPayload({ mode: 'test', doc: message.doc })
      setStartAt(message.startAt)
      setVersion(v => v + 1)
    })
  }, [where])

  if (error) return <EndedCard payload={{ mode: 'test', doc: null, ended: { kind: 'message', message: error } }} />
  if (!payload) return <div className={ui.center} aria-busy="true" />
  return (
    <>
      {update ? (
        <button
          type="button"
          className={ui.banner}
          onClick={() => {
            setPayload(update)
            setUpdate(null)
            setVersion(v => v + 1)
          }}
        >
          Updated · Tap to refresh
        </button>
      ) : null}
      <Player
        key={version}
        payload={payload}
        mode={where.mode}
        devToken={where.token}
        startAt={startAt}
        onStep={where.mode === 'embed' ? postStep : undefined}
      />
    </>
  )
}
