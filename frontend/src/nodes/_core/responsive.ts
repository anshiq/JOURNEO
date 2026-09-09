import type * as React from 'react'
import type { Breakpoint, ResponsiveOverride } from './types'

export function resolveResponsiveConfig<T extends Record<string, any>>(cfg: T, breakpoint: Breakpoint): T {
  const responsive = (cfg as any)?.responsive as ResponsiveOverride<T> | undefined
  if (!responsive || !responsive[breakpoint]) return cfg
  return { ...cfg, ...responsive[breakpoint] }
}

export const AD_GUARD: React.CSSProperties = {
  maxWidth: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  overflowWrap: 'break-word',
  wordBreak: 'break-word',
}

function clampPercent(value: string): string {
  const m = value.trim().match(/^(-?\d*\.?\d+)\s*%$/)
  if (!m) return value
  const n = Number(m[1])
  if (!Number.isFinite(n)) return value
  if (n > 100) return '100%'
  if (n < 0) return '0%'
  return value
}

function safeLength(value: string): string {
  const v = value.trim()
  if (/^-?\d*\.?\d+px$/.test(v)) return `min(${v}, 100%)`
  if (/^-?\d*\.?\d+%$/.test(v)) return clampPercent(v)
  if (/^-?\d*\.?\d+vw$/.test(v)) return `min(${v}, 100%)`
  return v
}

export function safeWidth(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  return safeLength(value.trim())
}

export function safeMinWidth(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const v = value.trim()
  if (v === '0' || v === '0px' || v === 'auto') return v === 'auto' ? undefined : '0'
  return safeLength(v)
}

export function withAdGuard(style: React.CSSProperties): React.CSSProperties {
  return { ...AD_GUARD, ...style, maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }
}

export function adTextGuard(extra?: React.CSSProperties): React.CSSProperties {
  return withAdGuard({ overflowWrap: 'break-word', wordBreak: 'break-word', hyphens: 'auto', ...extra })
}

export function adMediaStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    display: 'block',
    width: '100%',
    maxWidth: '100%',
    height: 'auto',
    objectFit: 'cover',
    ...extra,
  }
}
