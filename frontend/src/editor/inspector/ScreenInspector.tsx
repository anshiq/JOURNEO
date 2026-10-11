import type { Breakpoint } from '@experience/index'
import type { Screen } from '@journey/model/types'
import {
  countAdjustments,
  deleteScreen,
  duplicateScreen,
  renameScreen,
  resetDeviceAdjustments,
  updateScreen,
} from '@journey/ops/index'
import { LIMITS } from '@shared/limits.gen'
import { Copy, Play, Trash2 } from 'lucide-react'
import { AfterScreen } from '../canvas/AfterScreen'
import { useEditor } from '../store'
import { act } from '../store/commands'
import { Button } from '../ui/Button'
import { Section } from '../ui/Field'
import { Segmented } from '../ui/Segmented'
import { Switch } from '../ui/Switch'
import { FocalPoint } from './content'
import { NumberControl, SegmentedControl, SelectControl, TextControl } from './controls'
import { ColorRole } from './widgets/ColorRole'
import { ImageField } from './widgets/ImageField'

function setScreen(screenId: string, path: (string | number)[], value: unknown, label = 'Edit screen') {
  act(label, updateScreen(screenId, path, value), `screen:${screenId}:${path.join('.')}`)
}

type LayoutKey = 'preset' | 'width' | 'hAlign'

function LayoutChoice<T extends string>({
  screen,
  prop,
  label,
  options,
  breakpoint,
}: {
  screen: Screen
  prop: LayoutKey
  label: string
  options: { value: T; label: string }[]
  breakpoint: Breakpoint
}) {
  const device = breakpoint === 'mobile' ? null : breakpoint
  const override = device ? (screen.responsive?.[device]?.[prop] as T | null | undefined) : undefined
  const base = (screen.layout?.[prop] ?? options[0]?.value) as T
  const value = override ?? base
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-700">{label}</span>
        {device && override ? (
          <button
            type="button"
            className="rounded bg-amber-50 px-1.5 text-[11px] text-amber-800"
            onClick={() => setScreen(screen.id, ['responsive', device, prop], null, 'Reset device adjustment')}
          >
            {device === 'tablet' ? 'Tablet' : 'Desktop'} only · Reset
          </button>
        ) : null}
      </div>
      <Segmented
        label={label}
        value={value}
        options={options}
        onChange={next => {
          if (device && next !== base) setScreen(screen.id, ['responsive', device, prop], next)
          else {
            setScreen(screen.id, ['layout', prop], next)
            if (device) setScreen(screen.id, ['responsive', device, prop], null)
          }
        }}
      />
      {device ? (
        <p className="text-[11px] text-slate-500">
          Changes made while viewing {device} apply to {device} only
        </p>
      ) : null}
    </div>
  )
}

export function ScreenInspector({ screenId }: { screenId: string }) {
  const screen = useEditor(state => state.doc?.screens?.[screenId])
  const theme = useEditor(state => state.doc?.theme)
  const assistantOn = useEditor(state => Boolean(state.doc?.assistant))
  const breakpoint = useEditor(state => state.breakpoint)
  const allowBackDefault = useEditor(state => state.doc?.settings?.allowBack ?? false)
  if (!screen) return null
  const layout = screen.layout ?? {}
  const media = layout.media
  const adjustments = countAdjustments(screen as never)
  const background = screen.background
  return (
    <div className="h-full overflow-y-auto">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">Screen</p>
          <p className="truncate text-sm font-medium">{screen.name}</p>
        </div>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Play from this screen"
            title="Play from this screen"
            onClick={() => useEditor.getState().play(screenId)}
          >
            <Play size={15} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Duplicate screen"
            title="Duplicate screen"
            onClick={() => act('Duplicate screen', duplicateScreen(screenId))}
          >
            <Copy size={15} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Delete screen"
            title="Delete screen"
            onClick={() => act('Delete screen', deleteScreen(screenId))}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      </div>
      <Section title="Basics">
        <TextControl
          label="Screen name"
          field="name"
          max={LIMITS.screen_name}
          value={screen.name}
          onChange={value => act('Rename screen', renameScreen(screenId, value), `rename:${screenId}`)}
        />
        <AfterScreen screenId={screenId} />
      </Section>
      <Section title="Layout">
        <LayoutChoice
          screen={screen}
          prop="preset"
          label="Layout"
          breakpoint={breakpoint}
          options={[
            { value: 'stack', label: 'Stack' },
            { value: 'split', label: 'Split' },
            { value: 'cover', label: 'Cover' },
          ]}
        />
        <LayoutChoice
          screen={screen}
          prop="width"
          label="Content width"
          breakpoint={breakpoint}
          options={[
            { value: 'narrow', label: 'Narrow' },
            { value: 'normal', label: 'Normal' },
            { value: 'wide', label: 'Wide' },
          ]}
        />
        <LayoutChoice
          screen={screen}
          prop="hAlign"
          label="Align content"
          breakpoint={breakpoint}
          options={[
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
          ]}
        />
        <SegmentedControl
          label="Vertical position"
          value={layout.vAlign ?? 'top'}
          options={[
            { value: 'top', label: 'Top' },
            { value: 'center', label: 'Middle' },
          ]}
          onChange={value => setScreen(screenId, ['layout', 'vAlign'], value)}
        />
        <SegmentedControl
          label="Spacing"
          value={layout.spacing ?? 'comfortable'}
          options={[
            { value: 'compact', label: 'Compact' },
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'spacious', label: 'Spacious' },
          ]}
          onChange={value => setScreen(screenId, ['layout', 'spacing'], value)}
        />
      </Section>
      {layout.preset === 'split' || layout.preset === 'cover' ? (
        <Section title="Photo">
          <ImageField
            label={layout.preset === 'cover' ? 'Background photo' : 'Side photo'}
            field="media"
            src={media?.src}
            onPick={image =>
              setScreen(
                screenId,
                ['layout', 'media'],
                {
                  kind: 'image',
                  side: 'right',
                  onMobile: 'top',
                  darken: 40,
                  focal: { x: 50, y: 50 },
                  alt: '',
                  ...(media ?? {}),
                  src: image.src,
                  srcset: image.srcset ?? null,
                },
                'Replace photo',
              )
            }
            onClear={() => setScreen(screenId, ['layout', 'media'], null, 'Remove photo')}
          />
          {media?.src ? (
            <>
              <TextControl
                label="Describe the photo"
                field="alt"
                max={LIMITS.alt_text}
                value={media.alt}
                onChange={value => setScreen(screenId, ['layout', 'media', 'alt'], value)}
              />
              <FocalPoint
                src={media.src}
                x={media.focal?.x ?? 50}
                y={media.focal?.y ?? 50}
                onChange={(x, y) => setScreen(screenId, ['layout', 'media', 'focal'], { x, y })}
              />
              {layout.preset === 'split' ? (
                <>
                  <SegmentedControl
                    label="Photo side"
                    value={media.side ?? 'right'}
                    options={[
                      { value: 'left', label: 'Left' },
                      { value: 'right', label: 'Right' },
                    ]}
                    onChange={value => setScreen(screenId, ['layout', 'media', 'side'], value)}
                  />
                  <SelectControl
                    label="On phones"
                    value={media.onMobile ?? 'top'}
                    options={[
                      { value: 'top', label: 'Show above the content' },
                      { value: 'background', label: 'Use as background' },
                      { value: 'hidden', label: 'Hide' },
                    ]}
                    onChange={value => setScreen(screenId, ['layout', 'media', 'onMobile'], value)}
                  />
                </>
              ) : null}
              {layout.preset === 'cover' || media.onMobile === 'background' ? (
                <NumberControl
                  label="Darken photo (%)"
                  field="darken"
                  min={0}
                  max={80}
                  step={5}
                  value={media.darken ?? 40}
                  onChange={value => setScreen(screenId, ['layout', 'media', 'darken'], value ?? 40)}
                />
              ) : null}
            </>
          ) : null}
        </Section>
      ) : null}
      <Section title="Colours">
        <SegmentedControl
          label="Background"
          value={background?.type ?? 'theme'}
          options={[
            { value: 'theme', label: 'Theme' },
            { value: 'color', label: 'Colour' },
            { value: 'gradient', label: 'Gradient' },
            { value: 'image', label: 'Photo' },
          ]}
          onChange={value => {
            if (value === 'theme') setScreen(screenId, ['background'], null, 'Background')
            else if (value === 'color')
              setScreen(screenId, ['background'], { type: 'color', color: 'surface' }, 'Background')
            else if (value === 'gradient')
              setScreen(
                screenId,
                ['background'],
                { type: 'gradient', gradient: { from: 'primary', to: 'accent', direction: 'diagonal' } },
                'Background',
              )
            else setScreen(screenId, ['background'], { type: 'image', image: { src: '', darken: 40 } }, 'Background')
          }}
        />
        {background?.type === 'color' ? (
          <ColorRole
            label="Colour"
            theme={theme}
            value={background.color}
            allowDefault={false}
            allowCustom
            onChange={value => setScreen(screenId, ['background', 'color'], value ?? 'surface')}
          />
        ) : null}
        {background?.type === 'gradient' ? (
          <>
            <ColorRole
              label="From"
              theme={theme}
              value={background.gradient?.from}
              allowDefault={false}
              allowCustom
              onChange={value => setScreen(screenId, ['background', 'gradient', 'from'], value ?? 'primary')}
            />
            <ColorRole
              label="To"
              theme={theme}
              value={background.gradient?.to}
              allowDefault={false}
              allowCustom
              onChange={value => setScreen(screenId, ['background', 'gradient', 'to'], value ?? 'accent')}
            />
          </>
        ) : null}
        {background?.type === 'image' ? (
          <ImageField
            label="Background photo"
            src={background.image?.src}
            onPick={image =>
              setScreen(screenId, ['background', 'image'], { src: image.src, darken: background.image?.darken ?? 40 })
            }
          />
        ) : null}
        <Switch
          label="Use inverted colours"
          hint="Light text on a dark background"
          checked={screen.colorScheme === 'inverse'}
          onChange={v => setScreen(screenId, ['colorScheme'], v ? 'inverse' : 'theme')}
        />
      </Section>
      <Section title="Behaviour">
        <Switch
          label="Keep the main button visible on phones"
          checked={screen.stickyAction ?? false}
          onChange={v => setScreen(screenId, ['stickyAction'], v)}
        />
        <SelectControl
          label="Back button"
          value={
            screen.allowBack === null || screen.allowBack === undefined ? 'inherit' : screen.allowBack ? 'on' : 'off'
          }
          options={[
            { value: 'inherit', label: `Same as journey (${allowBackDefault ? 'shown' : 'hidden'})` },
            { value: 'on', label: 'Show' },
            { value: 'off', label: 'Hide' },
          ]}
          onChange={value => setScreen(screenId, ['allowBack'], value === 'inherit' ? null : value === 'on')}
        />
        {assistantOn ? (
          <Switch
            label="Show visitor chat on this screen"
            checked={screen.showAssistant ?? false}
            onChange={v => setScreen(screenId, ['showAssistant'], v)}
          />
        ) : null}
      </Section>
      {adjustments > 0 ? (
        <Section title="Device adjustments">
          <div className="flex items-center justify-between text-sm">
            <span>
              {adjustments} adjustment{adjustments === 1 ? '' : 's'} for tablet or desktop
            </span>
            <Button size="sm" onClick={() => act('Reset device adjustments', resetDeviceAdjustments(screenId))}>
              Reset all
            </Button>
          </div>
        </Section>
      ) : null}
    </div>
  )
}
