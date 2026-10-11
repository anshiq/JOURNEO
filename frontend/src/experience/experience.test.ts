import type { Element, Screen } from '@journey/model/types'
import { describe, expect, test } from 'vitest'
import { calendarFile } from './elements/actions'
import { validateField } from './elements/fields'
import { embedUrl } from './elements/video'
import { isHiddenAt, resolveLayout, resolveStyle } from './responsive/resolve'
import { resolveColors } from './theme/compile'
import { contrast, onColor } from './theme/contrast'
import { PRESETS } from './theme/presets'

const heading = (extra: Partial<Element> = {}): Element =>
  ({ id: 'el_h000001', type: 'heading', props: { text: 'Hi' }, ...extra }) as Element

describe('responsive cascade', () => {
  test('mobile-first style overrides', () => {
    const el = heading({
      style: { align: 'left', size: 'sm' },
      responsive: { tablet: { style: { align: 'center' } }, desktop: { style: { size: 'xl' } } },
    })
    expect(resolveStyle(el, 'mobile')).toEqual({ align: 'left', size: 'sm' })
    expect(resolveStyle(el, 'tablet')).toEqual({ align: 'center', size: 'sm' })
    expect(resolveStyle(el, 'desktop')).toEqual({ align: 'center', size: 'xl' })
  })

  test('null overrides reset to the theme default', () => {
    const el = heading({ style: { align: 'left' }, responsive: { tablet: { style: { align: null } } } })
    expect(resolveStyle(el, 'tablet').align).toBeNull()
  })

  test('hidden cascades upward', () => {
    const el = heading({ hidden: true, responsive: { desktop: { hidden: false } } })
    expect([isHiddenAt(el, 'mobile'), isHiddenAt(el, 'tablet'), isHiddenAt(el, 'desktop')]).toEqual([true, true, false])
  })

  test('screen layout overrides', () => {
    const screen = {
      id: 'scr_aaaaaa',
      name: 'A',
      layout: { preset: 'split', width: 'normal' },
      responsive: { desktop: { width: 'wide', mediaSide: 'left' } },
    } as Screen
    expect(resolveLayout(screen, 'tablet').width).toBe('normal')
    expect(resolveLayout(screen, 'desktop')).toMatchObject({ width: 'wide', mediaSide: 'left', preset: 'split' })
  })
})

describe('theme', () => {
  test('every preset keeps readable text and buttons', () => {
    for (const preset of PRESETS) {
      const colors = resolveColors(preset.theme)
      expect(contrast(colors.text, colors.background), preset.id).toBeGreaterThanOrEqual(4.5)
      expect(contrast(colors.onPrimary, colors.primary), preset.id).toBeGreaterThanOrEqual(4.5)
      expect(contrast(colors.muted, colors.background), preset.id).toBeGreaterThanOrEqual(4.5)
    }
  })

  test('on-colour picks the readable foreground', () => {
    expect(onColor('#ffff00')).toBe('#111827')
    expect(onColor('#1e1b4b')).toBe('#ffffff')
  })

  test('invalid colours fall back to defaults', () => {
    expect(resolveColors({ colors: { primary: 'red; background:url(x)' } } as never).primary).toBe('#4f46e5')
  })

  test('inverse scheme swaps text and background', () => {
    const colors = resolveColors({ colors: { text: '#111827', background: '#ffffff' } }, 'inverse')
    expect(colors.background).toBe('#111827')
    expect(colors.text).toBe('#ffffff')
  })
})

describe('form validation', () => {
  test.each([
    [{ kind: 'email', key: 'e', label: 'E', required: true }, '', 'This field is required'],
    [{ kind: 'email', key: 'e', label: 'E' }, 'nope', 'Enter a valid email address'],
    [{ kind: 'email', key: 'e', label: 'E' }, 'a@b.co', null],
    [{ kind: 'phone', key: 'p', label: 'P' }, '12', 'Enter a valid phone number'],
    [{ kind: 'number', key: 'n', label: 'N', min: 1, max: 5 }, '9', 'Enter 5 or less'],
    [{ kind: 'consent', key: 'c', label: 'C', required: true }, false, 'Please accept to continue'],
    [{ kind: 'dropdown', key: 'd', label: 'D', options: ['A'] }, 'B', 'Choose one of the options'],
  ])('%o with %o', (field, value, expected) => {
    expect(validateField(field, value)).toBe(expected)
  })
})

describe('media', () => {
  test('embeds use privacy-friendly hosts and reject junk', () => {
    expect(embedUrl('youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', false, false)).toMatch(
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/,
    )
    expect(embedUrl('youtube', 'https://youtu.be/dQw4w9WgXcQ', true, false)).toContain('mute=1')
    expect(embedUrl('vimeo', 'https://vimeo.com/123456', false, false)).toBe(
      'https://player.vimeo.com/video/123456?dnt=1',
    )
    expect(embedUrl('youtube', 'javascript:alert(1)', false, false)).toBeNull()
  })

  test('calendar files are valid ics data urls', () => {
    const url = calendarFile({
      kind: 'calendar',
      title: 'Launch, live',
      start: '2027-06-30T16:00:00Z',
      location: 'Online',
    })
    const body = decodeURIComponent(url.split(',').slice(1).join(','))
    expect(body).toContain('DTSTART:20270630T160000Z')
    expect(body).toContain('SUMMARY:Launch\\, live')
  })
})
