import type { Element } from '@journey/model/types'
import {
  addItem,
  clearBranchLinks,
  deleteItem,
  goToTopResult,
  moveItem,
  setVisibility,
  updateElement,
  updateItem,
} from '@journey/ops/index'
import { screenPorts } from '@journey/ports'
import { LIMITS } from '@shared/limits.gen'
import { useEditor } from '../store'
import { act, chain } from '../store/commands'
import { Button } from '../ui/Button'
import { Switch } from '../ui/Switch'
import { NumberControl, SegmentedControl } from './controls'
import { ConditionBuilder } from './widgets/ConditionBuilder'
import { DestinationPicker } from './widgets/DestinationPicker'
import { ListEditor, RowInput } from './widgets/ListEditor'

const BANDS: Record<string, { label: string; min: number; max: number }[]> = {
  nps: [
    { label: 'Detractors', min: 0, max: 6 },
    { label: 'Passives', min: 7, max: 8 },
    { label: 'Promoters', min: 9, max: 10 },
  ],
  stars: [
    { label: 'Unhappy', min: 1, max: 2 },
    { label: 'Okay', min: 3, max: 3 },
    { label: 'Happy', min: 4, max: 5 },
  ],
}

export function LogicEditor({ element, screenId }: { element: Element; screenId: string }) {
  const doc = useEditor(state => state.doc)
  const screen = doc?.screens?.[screenId]
  if (!doc || !screen) return null
  const ports = screenPorts(screen).filter(port => port.elementId === element.id)
  return (
    <div className="space-y-4">
      {element.type === 'choice' ? <ChoiceLogic element={element} screenId={screenId} /> : null}
      {element.type === 'rating' ? <RatingLogic element={element} /> : null}
      {ports.length ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-700">Where each answer goes</p>
          {ports.map(port => (
            <div key={port.port} className="space-y-1">
              <p className="truncate text-xs text-slate-600">{port.label || 'Other'}</p>
              <DestinationPicker stepId={screenId} port={port.port} fallback={port.fallback} />
            </div>
          ))}
        </div>
      ) : null}
      <div className="space-y-2 border-t border-slate-200 pt-3">
        <p className="text-xs font-medium text-slate-700">Show only if…</p>
        <ConditionBuilder
          doc={doc}
          value={element.visibleIf}
          allowEmpty
          emptyLabel="Always shown"
          onChange={value => act('Change visibility rule', setVisibility(element.id, value), `visible:${element.id}`)}
        />
      </div>
    </div>
  )
}

function ChoiceLogic({ element, screenId }: { element: Extract<Element, { type: 'choice' }>; screenId: string }) {
  const props = element.props
  const multiple = props.multiple ?? false
  return (
    <>
      {!multiple ? (
        <Switch
          label="Go on as soon as an option is picked"
          checked={props.autoAdvance ?? false}
          onChange={v => act('Edit', updateElement(element.id, ['props', 'autoAdvance'], v))}
        />
      ) : null}
      <Switch
        label="Send each answer to a different screen"
        hint={multiple ? 'Only works when one answer is allowed' : 'Every option starts on Next screen'}
        disabled={multiple}
        checked={props.branchByAnswer ?? false}
        onChange={v =>
          act(
            'Branch by answer',
            chain(updateElement(element.id, ['props', 'branchByAnswer'], v), !v && clearBranchLinks(element.id)),
          )
        }
      />
      <SegmentedControl
        label="Scoring"
        value={props.scoring ?? 'none'}
        options={[
          { value: 'none', label: 'None' },
          { value: 'points', label: 'Points' },
          { value: 'outcomes', label: 'Recommend a result' },
        ]}
        onChange={value => act('Change scoring', updateElement(element.id, ['props', 'scoring'], value))}
      />
      {props.scoring === 'outcomes' ? (
        <div className="space-y-2 rounded-md bg-indigo-50 p-2 text-xs text-indigo-900">
          <p>
            Pick a result screen for each option in Content, then add the step that sends visitors to their top result.
          </p>
          <Button
            size="sm"
            variant="primary"
            onClick={() => act('Go to top result', goToTopResult(screenId, element.id))}
          >
            Go to top result
          </Button>
        </div>
      ) : null}
    </>
  )
}

function RatingLogic({ element }: { element: Extract<Element, { type: 'rating' }> }) {
  const props = element.props
  const bands = props.bands ?? []
  const scale = props.scale ?? 'stars'
  const max = props.max ?? (scale === 'nps' ? 10 : 5)
  const low = scale === 'nps' ? 0 : 1
  return (
    <>
      <Switch
        label="Send visitors to different screens by score"
        checked={props.branchByScore ?? false}
        onChange={v =>
          act(
            'Branch by score',
            chain(
              updateElement(element.id, ['props', 'branchByScore'], v),
              ...(v && bands.length === 0
                ? (BANDS[scale] ?? BANDS.stars ?? []).map(band =>
                    addItem(element.id, { ...band, max: Math.min(band.max, max) }),
                  )
                : []),
              !v && clearBranchLinks(element.id),
            ),
          )
        }
      />
      {props.branchByScore ? (
        <ListEditor
          label="Score groups"
          addLabel="Add group"
          items={bands}
          max={LIMITS.max_bands}
          min={1}
          onAdd={() => act('Add group', addItem(element.id, { label: 'Group', min: low, max }))}
          onMove={(from, to) => act('Reorder groups', moveItem(element.id, from, to))}
          onDelete={band => act('Delete group', deleteItem(element.id, band.id))}
          renderRow={band => (
            <>
              <RowInput
                label="Group name"
                max={LIMITS.rating_label}
                value={band.label}
                onChange={value =>
                  act('Edit group', updateItem(element.id, band.id, ['label'], value), `${band.id}:label`)
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <NumberControl
                  label="From"
                  min={low}
                  max={max}
                  value={band.min ?? low}
                  onChange={value =>
                    act('Edit group', updateItem(element.id, band.id, ['min'], value ?? low), `${band.id}:min`)
                  }
                />
                <NumberControl
                  label="To"
                  min={low}
                  max={max}
                  value={band.max ?? max}
                  onChange={value =>
                    act('Edit group', updateItem(element.id, band.id, ['max'], value ?? max), `${band.id}:max`)
                  }
                />
              </div>
            </>
          )}
        />
      ) : null}
    </>
  )
}
