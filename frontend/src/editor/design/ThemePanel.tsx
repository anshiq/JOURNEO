import { contrast, FONTS, PAIRINGS, PRESETS, resolveColors } from '@experience/index'
import type { Theme } from '@journey/model/types'
import { applyPreset, customColorCount, setTheme } from '@journey/ops/index'
import { LIMITS } from '@shared/limits.gen'
import { cn } from '@shared/ui/cn'
import { useState } from 'react'
import { SegmentedControl, SelectControl, TextControl } from '../inspector/controls'
import { ColorRole } from '../inspector/widgets/ColorRole'
import { ImageField } from '../inspector/widgets/ImageField'
import { useEditor } from '../store'
import { act } from '../store/commands'
import { Confirm } from '../ui/Confirm'
import { Section } from '../ui/Field'
import { RestyleWithAi } from './RestyleWithAi'

function theme(path: (string | number)[], value: unknown, label = 'Change design') {
  act(label, setTheme(path, value), `theme:${path.join('.')}`)
}

const COLOR_FIELDS = [
  { key: 'primary', label: 'Primary' },
  { key: 'accent', label: 'Accent' },
  { key: 'background', label: 'Background' },
  { key: 'surface', label: 'Cards & fields' },
  { key: 'text', label: 'Text' },
] as const

export function ThemePanel() {
  const doc = useEditor(state => state.doc)
  const [pending, setPending] = useState<{ theme: Theme; label: string } | null>(null)
  if (!doc) return null
  const current = doc.theme ?? {}
  const colors = resolveColors(current) as unknown as Record<string, string>
  const fonts = current.fonts ?? {}
  const customCount = customColorCount(doc)
  const pick = (preset: { theme: Theme; label: string }) => {
    if (customCount > 0) setPending(preset)
    else act(`Apply ${preset.label}`, applyPreset(preset.theme, false))
  }
  const textContrast = contrast(colors.text ?? '#000000', colors.background ?? '#ffffff')
  const buttonContrast = contrast(colors.onPrimary ?? '#ffffff', colors.primary ?? '#000000')
  return (
    <div className="h-full overflow-y-auto" data-panel="theme">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-sm font-medium">Design</p>
        <p className="text-xs text-slate-500">Applies to every screen</p>
      </div>
      <RestyleWithAi />
      <Section title="Start from a look">
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map(preset => {
            const c = resolveColors(preset.theme) as unknown as Record<string, string>
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => pick(preset)}
                className={cn(
                  'rounded-lg border p-2 text-left text-xs transition hover:border-indigo-400',
                  current.preset === preset.id ? 'border-indigo-500 ring-1 ring-indigo-300' : 'border-slate-200',
                )}
                style={{ background: c.background, color: c.text }}
              >
                <span className="flex gap-1">
                  {['primary', 'accent', 'surface'].map(role => (
                    <span
                      key={role}
                      className="h-4 w-4 rounded-full border border-black/10"
                      style={{ background: c[role] }}
                    />
                  ))}
                </span>
                <span className="mt-1.5 block font-medium">{preset.label}</span>
              </button>
            )
          })}
        </div>
      </Section>
      <Section title="Colours">
        <div className="grid grid-cols-2 gap-2">
          {COLOR_FIELDS.map(field => (
            <label
              key={field.key}
              className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-xs"
            >
              <span
                className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-slate-300"
                style={{ background: colors[field.key] }}
              >
                <input
                  type="color"
                  aria-label={`${field.label} colour`}
                  value={colors[field.key] ?? '#000000'}
                  onChange={event => theme(['colors', field.key], event.target.value, 'Change colour')}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </span>
              {field.label}
            </label>
          ))}
        </div>
        {textContrast < 4.5 ? (
          <p className="text-xs text-amber-700">Text may be hard to read on this background.</p>
        ) : null}
        {buttonContrast < 4.5 ? (
          <p className="text-xs text-amber-700">Button text may be hard to read on the primary colour.</p>
        ) : null}
      </Section>
      <Section title="Fonts">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(PAIRINGS).map(([id, pairing]) => (
            <button
              key={id}
              type="button"
              onClick={() => theme(['fonts'], { pairing: id }, 'Change fonts')}
              className={cn(
                'rounded-md border px-2 py-1.5 text-left text-xs',
                (fonts.pairing ?? 'classic') === id && !fonts.heading && !fonts.body
                  ? 'border-indigo-500 ring-1 ring-indigo-300'
                  : 'border-slate-200 hover:border-indigo-300',
              )}
            >
              <span className="block font-medium">{pairing.label}</span>
              <span className="text-slate-500">
                {FONTS[pairing.heading].label} / {FONTS[pairing.body].label}
              </span>
            </button>
          ))}
        </div>
        <details className="text-xs">
          <summary className="cursor-pointer text-indigo-700">Customize fonts</summary>
          <div className="mt-2 space-y-2">
            <SelectControl
              label="Headings"
              value={fonts.heading ?? ''}
              options={[
                { value: '', label: 'From pairing' },
                ...Object.entries(FONTS).map(([id, font]) => ({ value: id, label: font.label })),
              ]}
              onChange={value => theme(['fonts', 'heading'], value || null, 'Change fonts')}
            />
            <SelectControl
              label="Body text"
              value={fonts.body ?? ''}
              options={[
                { value: '', label: 'From pairing' },
                ...Object.entries(FONTS).map(([id, font]) => ({ value: id, label: font.label })),
              ]}
              onChange={value => theme(['fonts', 'body'], value || null, 'Change fonts')}
            />
          </div>
        </details>
        <SegmentedControl
          label="Text size"
          value={current.typeScale ?? 'default'}
          options={[
            { value: 'compact', label: 'Compact' },
            { value: 'default', label: 'Default' },
            { value: 'large', label: 'Large' },
          ]}
          onChange={value => theme(['typeScale'], value)}
        />
      </Section>
      <Section title="Shapes">
        <SegmentedControl
          label="Corners"
          value={current.radius ?? 'md'}
          options={[
            { value: 'none', label: 'Square' },
            { value: 'sm', label: 'S' },
            { value: 'md', label: 'M' },
            { value: 'lg', label: 'L' },
            { value: 'full', label: 'Round' },
          ]}
          onChange={value => theme(['radius'], value)}
        />
        <SegmentedControl
          label="Buttons"
          value={current.buttons?.style ?? 'solid'}
          options={[
            { value: 'solid', label: 'Solid' },
            { value: 'outline', label: 'Outline' },
            { value: 'soft', label: 'Soft' },
          ]}
          onChange={value => theme(['buttons', 'style'], value)}
        />
        <SegmentedControl
          label="Button text"
          value={current.buttons?.case ?? 'normal'}
          options={[
            { value: 'normal', label: 'Normal' },
            { value: 'upper', label: 'UPPERCASE' },
          ]}
          onChange={value => theme(['buttons', 'case'], value)}
        />
        <SegmentedControl
          label="Fields"
          value={current.inputs?.style ?? 'outline'}
          options={[
            { value: 'outline', label: 'Outline' },
            { value: 'filled', label: 'Filled' },
            { value: 'underline', label: 'Underline' },
          ]}
          onChange={value => theme(['inputs', 'style'], value)}
        />
        <SegmentedControl
          label="Spacing"
          value={current.density ?? 'comfortable'}
          options={[
            { value: 'compact', label: 'Compact' },
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'spacious', label: 'Spacious' },
          ]}
          onChange={value => theme(['density'], value)}
        />
      </Section>
      <Section title="Background">
        <SegmentedControl
          label="Background"
          value={current.background?.type ?? 'color'}
          options={[
            { value: 'color', label: 'Colour' },
            { value: 'gradient', label: 'Gradient' },
            { value: 'image', label: 'Photo' },
          ]}
          onChange={value =>
            theme(
              ['background'],
              value === 'color'
                ? { type: 'color', color: 'background' }
                : value === 'gradient'
                  ? { type: 'gradient', gradient: { from: 'background', to: 'surface', direction: 'down' } }
                  : { type: 'image', image: { src: current.background?.image?.src ?? '', darken: 30 } },
              'Change background',
            )
          }
        />
        {current.background?.type === 'gradient' ? (
          <>
            <ColorRole
              label="From"
              theme={current}
              value={current.background.gradient?.from}
              allowDefault={false}
              allowCustom
              onChange={value => theme(['background', 'gradient', 'from'], value ?? 'background')}
            />
            <ColorRole
              label="To"
              theme={current}
              value={current.background.gradient?.to}
              allowDefault={false}
              allowCustom
              onChange={value => theme(['background', 'gradient', 'to'], value ?? 'surface')}
            />
          </>
        ) : null}
        {current.background?.type === 'image' ? (
          <ImageField
            label="Background photo"
            src={current.background.image?.src}
            onPick={image =>
              theme(
                ['background', 'image'],
                { src: image.src, darken: current.background?.image?.darken ?? 30 },
                'Change background',
              )
            }
          />
        ) : null}
      </Section>
      <Section title="Logo">
        <ImageField
          label="Logo"
          field="logo"
          compact
          src={current.logo?.src}
          onPick={image =>
            theme(['logo'], { position: 'left', size: 'md', ...(current.logo ?? {}), src: image.src }, 'Change logo')
          }
          onClear={() => theme(['logo'], null, 'Remove logo')}
        />
        {current.logo?.src ? (
          <>
            <SegmentedControl
              label="Position"
              value={current.logo.position ?? 'left'}
              options={[
                { value: 'left', label: 'Left' },
                { value: 'center', label: 'Center' },
              ]}
              onChange={value => theme(['logo', 'position'], value)}
            />
            <SegmentedControl
              label="Size"
              value={current.logo.size ?? 'md'}
              options={[
                { value: 'sm', label: 'S' },
                { value: 'md', label: 'M' },
                { value: 'lg', label: 'L' },
              ]}
              onChange={value => theme(['logo', 'size'], value)}
            />
          </>
        ) : null}
      </Section>
      <Section title="Brand voice">
        <TextControl
          label="How should your brand sound?"
          multiline
          max={LIMITS.brand_voice}
          value={current.voice}
          placeholder="Friendly and upbeat, short sentences, no jargon"
          hint="Used by writing help and visitor chat"
          onChange={value => theme(['voice'], value || null, 'Change brand voice')}
        />
      </Section>
      <Confirm
        open={pending !== null}
        onOpenChange={open => !open && setPending(null)}
        title="Also reset custom colours?"
        description={`${customCount} screen or element colour${customCount === 1 ? '' : 's'} were changed by hand.`}
        confirmLabel="Reset them"
        cancelLabel="Keep them"
        onConfirm={() => pending && act(`Apply ${pending.label}`, applyPreset(pending.theme, true))}
        onCancel={() => pending && act(`Apply ${pending.label}`, applyPreset(pending.theme, false))}
      />
    </div>
  )
}
