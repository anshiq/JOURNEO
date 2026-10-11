import type { Element } from '@journey/model/types'
import { setHidden } from '@journey/ops/index'
import { useEditor } from '../store'
import { act, chain } from '../store/commands'
import { Segmented } from '../ui/Segmented'
import { Switch } from '../ui/Switch'
import { ColorRole } from './widgets/ColorRole'
import { StyleField } from './widgets/StyleField'

type Prop =
  | 'align'
  | 'size'
  | 'colorRole'
  | 'emphasis'
  | 'width'
  | 'spacingBefore'
  | 'spacingAfter'
  | 'radius'
  | 'fullWidth'
  | 'columns'

const BY_TYPE: Record<Element['type'], Prop[]> = {
  heading: ['align', 'size', 'colorRole', 'emphasis', 'spacingBefore', 'spacingAfter'],
  text: ['align', 'size', 'colorRole', 'emphasis', 'spacingBefore', 'spacingAfter'],
  image: ['width', 'radius', 'align', 'spacingBefore', 'spacingAfter'],
  video: ['width', 'radius', 'spacingBefore', 'spacingAfter'],
  buttons: ['align', 'size', 'fullWidth', 'spacingBefore', 'spacingAfter'],
  cards: ['columns', 'radius', 'spacingBefore', 'spacingAfter'],
  countdown: ['align', 'size', 'colorRole', 'spacingBefore', 'spacingAfter'],
  spacer: ['colorRole'],
  choice: ['columns', 'size', 'spacingBefore', 'spacingAfter'],
  rating: ['align', 'size', 'colorRole', 'spacingBefore', 'spacingAfter'],
  form: ['columns', 'spacingBefore', 'spacingAfter'],
}

const SPACING = [
  { value: 'none', label: '0' },
  { value: 'sm', label: 'S' },
  { value: 'md', label: 'M' },
  { value: 'lg', label: 'L' },
  { value: 'xl', label: 'XL' },
] as const

export function StyleEditor({ element }: { element: Element }) {
  const theme = useEditor(state => state.doc?.theme)
  const props = BY_TYPE[element.type]
  return (
    <div className="space-y-4">
      {props.includes('align') ? (
        <StyleField
          element={element}
          prop="align"
          label="Alignment"
          render={(value, set) => (
            <Segmented
              label="Alignment"
              value={value ?? 'left'}
              options={[
                { value: 'left', label: 'Left' },
                { value: 'center', label: 'Center' },
                { value: 'right', label: 'Right' },
              ]}
              onChange={set}
            />
          )}
        />
      ) : null}
      {props.includes('size') ? (
        <StyleField
          element={element}
          prop="size"
          label="Size"
          render={(value, set) => (
            <Segmented
              label="Size"
              value={value ?? 'md'}
              options={[
                { value: 'sm', label: 'S' },
                { value: 'md', label: 'M' },
                { value: 'lg', label: 'L' },
                { value: 'xl', label: 'XL' },
              ]}
              onChange={set}
            />
          )}
        />
      ) : null}
      {props.includes('colorRole') ? (
        <StyleField
          element={element}
          prop="colorRole"
          label="Colour"
          render={(value, set) => (
            <ColorRole label="Colour" theme={theme} value={value} onChange={v => set(v as never)} />
          )}
        />
      ) : null}
      {props.includes('emphasis') ? (
        <StyleField
          element={element}
          prop="emphasis"
          label="Emphasis"
          render={(value, set) => (
            <Segmented
              label="Emphasis"
              value={value ?? 'normal'}
              options={[
                { value: 'subtle', label: 'Subtle' },
                { value: 'normal', label: 'Normal' },
                { value: 'strong', label: 'Strong' },
              ]}
              onChange={set}
            />
          )}
        />
      ) : null}
      {props.includes('width') ? (
        <StyleField
          element={element}
          prop="width"
          label="Width"
          render={(value, set) => (
            <Segmented
              label="Width"
              value={value ?? 'full'}
              options={[
                { value: 'narrow', label: 'Narrow' },
                { value: 'normal', label: 'Normal' },
                { value: 'full', label: 'Full' },
              ]}
              onChange={set}
            />
          )}
        />
      ) : null}
      {props.includes('radius') ? (
        <StyleField
          element={element}
          prop="radius"
          label="Corners"
          render={(value, set) => (
            <Segmented
              label="Corners"
              value={value ?? 'md'}
              options={[
                { value: 'none', label: 'Square' },
                { value: 'sm', label: 'S' },
                { value: 'md', label: 'M' },
                { value: 'lg', label: 'L' },
                { value: 'full', label: 'Round' },
              ]}
              onChange={set}
            />
          )}
        />
      ) : null}
      {props.includes('columns') ? (
        <StyleField
          element={element}
          prop="columns"
          label="Columns on large screens"
          render={(value, set) => (
            <Segmented
              label="Columns"
              value={value ? String(value) : 'auto'}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3' },
                { value: '4', label: '4' },
              ]}
              onChange={v => set(v === 'auto' ? null : (Number(v) as 1 | 2 | 3 | 4))}
            />
          )}
        />
      ) : null}
      {props.includes('fullWidth') ? (
        <StyleField
          element={element}
          prop="fullWidth"
          label="Full width"
          render={(value, set) => (
            <Switch label="Stretch buttons to full width" checked={value ?? false} onChange={set} />
          )}
        />
      ) : null}
      {props.includes('spacingBefore') ? (
        <StyleField
          element={element}
          prop="spacingBefore"
          label="Space above"
          render={(value, set) => (
            <Segmented label="Space above" value={value ?? 'md'} options={[...SPACING]} onChange={set} />
          )}
        />
      ) : null}
      {props.includes('spacingAfter') ? (
        <StyleField
          element={element}
          prop="spacingAfter"
          label="Space below"
          render={(value, set) => (
            <Segmented label="Space below" value={value ?? 'md'} options={[...SPACING]} onChange={set} />
          )}
        />
      ) : null}
      <DeviceVisibility element={element} />
    </div>
  )
}

function DeviceVisibility({ element }: { element: Element }) {
  const tablet = element.responsive?.tablet?.hidden
  const desktop = element.responsive?.desktop?.hidden
  const base = element.hidden ?? false
  const onMobile = !base
  const onTablet = !(tablet ?? base)
  const onDesktop = !(desktop ?? tablet ?? base)
  return (
    <div className="space-y-1 border-t border-slate-200 pt-3">
      <p className="text-xs font-medium text-slate-700">Show on</p>
      <Switch
        label="Mobile"
        checked={onMobile}
        onChange={show => act(show ? 'Show on mobile' : 'Hide on mobile', setHidden(element.id, !show, 'mobileOnly'))}
      />
      <Switch
        label="Tablet"
        checked={onTablet}
        onChange={show =>
          act(
            show ? 'Show on tablet' : 'Hide on tablet',
            chain(
              setHidden(element.id, !show, 'tabletUp'),
              onDesktop !== !show && setHidden(element.id, !onDesktop, 'desktopOnly'),
            ),
          )
        }
      />
      <Switch
        label="Desktop"
        checked={onDesktop}
        onChange={show =>
          act(show ? 'Show on desktop' : 'Hide on desktop', setHidden(element.id, !show, 'desktopOnly'))
        }
      />
    </div>
  )
}
