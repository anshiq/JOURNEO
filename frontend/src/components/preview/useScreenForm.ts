import * as React from 'react'
import type { LiveBlock } from '../../lib/liveSession'
import { evalVisibleWhen } from '../../lib/screen'

const cache = new Map<string, Record<string, any>>()

function defaultForBlock(b: LiveBlock): any {
  const cfg = b.config || {}
  if (b.type === 'checkbox') {
    if (typeof cfg.defaultChecked === 'boolean') return cfg.defaultChecked
    if (typeof cfg.checked === 'boolean') return cfg.checked
    return false
  }
  if (b.type === 'rating') {
    if (typeof cfg.defaultValue === 'number') return cfg.defaultValue
    if (typeof cfg.value === 'number') return cfg.value
    return 0
  }
  if (b.type === 'select' && (cfg.blockRequired || cfg.required)) {
    const opts = cfg.options
    if (Array.isArray(opts) && opts.length > 0) return opts[0].value ?? opts[0].id ?? ''
  }
  return undefined
}

function isEmpty(v: any): boolean {
  if (v === undefined || v === null) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  if (typeof v === 'boolean') return v === false
  if (typeof v === 'number') return false
  if (typeof v === 'object') return Object.keys(v).length === 0
  return false
}

export function useScreenForm(screenId: string, blocks: LiveBlock[], advance: any): {
  values: Record<string, any>
  errors: Record<string, string>
  touched: Record<string, boolean>
  setValue: (key: string, v: any) => void
  isValid: boolean
  missing: string[]
  collect: () => Record<string, any>
} {
  const [values, setValues] = React.useState<Record<string, any>>(() => {
    const cached = cache.get(screenId)
    if (cached) return { ...cached }
    const seed: Record<string, any> = {}
    for (const b of blocks) {
      const key = (b.config || {}).blockKey
      if (!key) continue
      const d = defaultForBlock(b)
      if (d !== undefined) seed[key] = d
    }
    return seed
  })
  const [touched, setTouched] = React.useState<Record<string, boolean>>({})
  React.useEffect(() => {
    const cached = cache.get(screenId)
    if (cached) {
      setValues({ ...cached })
    } else {
      setValues(prev => {
        const next = { ...prev }
        for (const b of blocks) {
          const key = (b.config || {}).blockKey
          if (!key || key in next) continue
          const d = defaultForBlock(b)
          if (d !== undefined) next[key] = d
        }
        return next
      })
    }
    setTouched({})
  }, [screenId])
  const setValue = React.useCallback((key: string, v: any) => {
    setValues(prev => {
      const next = { ...prev, [key]: v }
      cache.set(screenId, next)
      return next
    })
    setTouched(prev => ({ ...prev, [key]: true }))
  }, [screenId])
  const { errors, missing, isValid } = React.useMemo(() => {
    const errs: Record<string, string> = {}
    const miss: string[] = []
    for (const b of blocks) {
      const cfg = b.config || {}
      if (cfg.blockVisibleWhen && !evalVisibleWhen(cfg.blockVisibleWhen, values, {})) continue
      const key = cfg.blockKey
      const req = Boolean(cfg.blockRequired || cfg.required)
      if (key && req && isEmpty(values[key])) {
        errs[key] = 'Required'
        miss.push(cfg.label || key)
      }
      if (b.type === 'form' && Array.isArray(cfg.fields)) {
        const fv = key ? values[key] : values
        const scope = key ? (fv && typeof fv === 'object' ? fv : {}) : values
        for (const f of cfg.fields) {
          if (f.required && isEmpty(scope[f.id])) {
            errs[`${key || 'form'}.${f.id}`] = 'Required'
            miss.push(f.label || f.id)
          }
        }
      }
    }
    for (const r of advance?.requireBlocks || []) {
      if (!blocks.some(b => (b.config || {}).blockKey === r)) continue
      if (isEmpty(values[r]) && !miss.includes(r)) {
        errs[r] = 'Required'
        miss.push(r)
      }
    }
    return { errors: errs, missing: miss, isValid: miss.length === 0 }
  }, [values, blocks, advance])
  const collect = React.useCallback(() => ({ ...values }), [values])
  return { values, errors, touched, setValue, isValid, missing, collect }
}

export function clearScreenFormCache(screenId?: string) {
  if (screenId) cache.delete(screenId)
  else cache.clear()
}
