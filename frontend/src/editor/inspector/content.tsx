import type { Element } from '@journey/model/types'
import {
  addItem,
  allKeys,
  deleteItem,
  moveItem,
  pasteItems,
  slugifyKey,
  updateElement,
  updateItem,
} from '@journey/ops/index'
import { LIMITS } from '@shared/limits.gen'
import { useAltText } from '../queries/ai'
import { useEditor } from '../store'
import { act, findElement } from '../store/commands'
import { Menu } from '../ui/Menu'
import { Switch } from '../ui/Switch'
import { DateTimeControl, NumberControl, SegmentedControl, SelectControl, TextControl } from './controls'
import { ActionEditor } from './widgets/ActionEditor'
import { ImageField } from './widgets/ImageField'
import { ListEditor, RowInput } from './widgets/ListEditor'

type Of<T extends Element['type']> = Extract<Element, { type: T }>

export function edit(elementId: string, path: (string | number)[], value: unknown, label = 'Edit') {
  act(label, updateElement(elementId, path, value), `${elementId}:${path.join('.')}`)
}

function editItem(elementId: string, itemId: string, path: (string | number)[], value: unknown) {
  act('Edit item', updateItem(elementId, itemId, path, value), `${elementId}:${itemId}:${path.join('.')}`)
}

function useSelectedItem(elementId: string): string | undefined {
  return useEditor(state =>
    state.selection.kind === 'item' && state.selection.elementId === elementId ? state.selection.itemId : undefined,
  )
}

function selectItem(screenId: string, elementId: string, itemId: string) {
  const current = useEditor.getState().selection
  if (current.kind === 'item' && current.itemId === itemId) return
  useEditor.getState().select({ kind: 'item', screenId, elementId, itemId })
}

export function ContentEditor({ element, screenId }: { element: Element; screenId: string }) {
  switch (element.type) {
    case 'heading':
      return <HeadingContent element={element} />
    case 'text':
      return <TextContent element={element} />
    case 'image':
      return <ImageContent element={element} />
    case 'video':
      return <VideoContent element={element} />
    case 'buttons':
      return <ButtonsContent element={element} screenId={screenId} />
    case 'cards':
      return <CardsContent element={element} screenId={screenId} />
    case 'countdown':
      return <CountdownContent element={element} />
    case 'spacer':
      return <SpacerContent element={element} />
    case 'choice':
      return <ChoiceContent element={element} screenId={screenId} />
    case 'rating':
      return <RatingContent element={element} />
    case 'form':
      return <FormContent element={element} screenId={screenId} />
  }
}

function HeadingContent({ element }: { element: Of<'heading'> }) {
  return (
    <>
      <TextControl
        label="Heading"
        field="text"
        max={LIMITS.heading}
        multiline
        rows={2}
        value={element.props.text}
        onChange={value => edit(element.id, ['props', 'text'], value)}
        hint="Tip: click the heading on the screen to edit it in place"
      />
      <SegmentedControl
        label="Size"
        value={String(element.props.level ?? 1) as '1' | '2' | '3'}
        options={[
          { value: '1', label: 'Large' },
          { value: '2', label: 'Medium' },
          { value: '3', label: 'Small' },
        ]}
        onChange={value => edit(element.id, ['props', 'level'], Number(value))}
      />
    </>
  )
}

function TextContent({ element }: { element: Of<'text'> }) {
  return (
    <>
      <TextControl
        label="Text"
        field="text"
        max={LIMITS.text}
        multiline
        rows={5}
        value={element.props.text}
        onChange={value => edit(element.id, ['props', 'text'], value)}
        hint="Use **bold**, *italic* and - for lists, or edit on the screen"
      />
      <SelectControl
        label="Style"
        value={element.props.preset ?? 'body'}
        options={[
          { value: 'body', label: 'Body' },
          { value: 'lead', label: 'Lead' },
          { value: 'caption', label: 'Caption' },
          { value: 'quote', label: 'Quote' },
          { value: 'eyebrow', label: 'Eyebrow' },
          { value: 'notice', label: 'Notice' },
        ]}
        onChange={value => edit(element.id, ['props', 'preset'], value)}
      />
      <SegmentedControl
        label="List style"
        value={element.props.listStyle ?? 'none'}
        options={[
          { value: 'none', label: 'None' },
          { value: 'bullet', label: 'Bullets' },
          { value: 'check', label: 'Checks' },
          { value: 'number', label: 'Numbers' },
        ]}
        onChange={value => edit(element.id, ['props', 'listStyle'], value === 'none' ? null : value)}
      />
    </>
  )
}

function fillAlt(elementId: string, text: string) {
  const doc = useEditor.getState().doc
  const element = doc ? findElement(doc, elementId)?.element : undefined
  if (!text || element?.type !== 'image' || element.props.alt) return
  act('Describe image', updateElement(elementId, ['props', 'alt'], text))
}

function ImageContent({ element }: { element: Of<'image'> }) {
  const props = element.props
  const alt = useAltText()
  return (
    <>
      <ImageField
        label="Image"
        field="src"
        src={props.src}
        onPick={image => {
          act(
            'Replace image',
            updateElement(element.id, ['props'], {
              ...props,
              src: image.src,
              srcset: image.srcset ?? null,
              width: image.width ?? null,
              height: image.height ?? null,
              dominantColor: image.dominantColor ?? null,
              attribution: image.attribution ?? null,
            }),
          )
          if (!props.alt) alt.mutate(image.src, { onSuccess: text => fillAlt(element.id, text) })
        }}
      />
      <TextControl
        label="Describe the image"
        field="alt"
        max={LIMITS.alt_text}
        value={props.alt}
        onChange={value => edit(element.id, ['props', 'alt'], value)}
        hint="Read aloud by screen readers"
      />
      <SelectControl
        label="Shape"
        value={props.aspect ?? 'auto'}
        options={[
          { value: 'auto', label: 'Original' },
          { value: '1:1', label: 'Square' },
          { value: '4:5', label: 'Portrait' },
          { value: '3:2', label: 'Landscape' },
          { value: '16:9', label: 'Wide' },
        ]}
        onChange={value => edit(element.id, ['props', 'aspect'], value)}
      />
      {props.src ? (
        <FocalPoint
          src={props.src}
          x={props.focal?.x ?? 50}
          y={props.focal?.y ?? 50}
          onChange={(x, y) => edit(element.id, ['props', 'focal'], { x, y })}
        />
      ) : null}
      {props.attribution ? <p className="text-[11px] text-slate-500">Credit: {props.attribution}</p> : null}
      <DesktopImage element={element} />
    </>
  )
}

function DesktopImage({ element }: { element: Of<'image'> }) {
  const desktop = element.responsive?.desktop?.src
  return desktop ? (
    <ImageField
      label="Different image on desktop"
      compact
      src={desktop}
      onPick={image => edit(element.id, ['responsive', 'desktop', 'src'], image.src, 'Desktop image')}
      onClear={() => edit(element.id, ['responsive', 'desktop', 'src'], null, 'Desktop image')}
    />
  ) : (
    <button
      type="button"
      className="text-xs font-medium text-indigo-700 hover:underline"
      onClick={() => edit(element.id, ['responsive', 'desktop', 'src'], element.props.src, 'Desktop image')}
    >
      Use a different image on desktop
    </button>
  )
}

export function FocalPoint({
  src,
  x,
  y,
  onChange,
}: {
  src: string
  x: number
  y: number
  onChange: (x: number, y: number) => void
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-700">Focus point</p>
      <button
        type="button"
        aria-label="Click the most important part of the image"
        className="relative block w-full overflow-hidden rounded-md"
        onClick={event => {
          const rect = event.currentTarget.getBoundingClientRect()
          const nx = Math.round(((event.clientX - rect.left) / rect.width) * 100)
          const ny = Math.round(((event.clientY - rect.top) / rect.height) * 100)
          onChange(Math.max(0, Math.min(100, nx)), Math.max(0, Math.min(100, ny)))
        }}
      >
        <img src={src} alt="" className="block max-h-40 w-full object-contain" />
        <span
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-indigo-600 shadow"
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      </button>
      <p className="text-[11px] text-slate-500">Click the part that should stay visible when the image is cropped</p>
    </div>
  )
}

function detectVideo(url: string): 'youtube' | 'vimeo' | 'file' {
  if (/youtu\.?be/.test(url)) return 'youtube'
  if (/vimeo\.com/.test(url)) return 'vimeo'
  return 'file'
}

function VideoContent({ element }: { element: Of<'video'> }) {
  const props = element.props
  return (
    <>
      <TextControl
        label="YouTube or Vimeo link"
        field="source"
        type="url"
        max={LIMITS.url}
        value={props.source.url}
        placeholder="https://www.youtube.com/watch?v=…"
        onChange={url => edit(element.id, ['props', 'source'], { kind: detectVideo(url), url })}
      />
      <ImageField
        label="Cover image"
        compact
        src={props.poster}
        onPick={image => edit(element.id, ['props', 'poster'], image.src)}
        onClear={() => edit(element.id, ['props', 'poster'], null)}
      />
      <SelectControl
        label="Shape"
        value={props.aspect ?? '16:9'}
        options={[
          { value: '16:9', label: 'Wide' },
          { value: '1:1', label: 'Square' },
          { value: '4:5', label: 'Portrait' },
          { value: '9:16', label: 'Vertical' },
        ]}
        onChange={value => edit(element.id, ['props', 'aspect'], value)}
      />
      <Switch
        label="Play automatically (muted)"
        checked={props.autoplay ?? false}
        onChange={v => edit(element.id, ['props', 'autoplay'], v)}
      />
      <Switch label="Loop" checked={props.loop ?? false} onChange={v => edit(element.id, ['props', 'loop'], v)} />
    </>
  )
}

function ButtonsContent({ element, screenId }: { element: Of<'buttons'>; screenId: string }) {
  const items = element.props.items ?? []
  const selected = useSelectedItem(element.id)
  return (
    <>
      <ListEditor
        label="Buttons"
        addLabel="Add button"
        items={items}
        max={LIMITS.max_buttons}
        min={1}
        selectedId={selected}
        onSelect={item => selectItem(screenId, element.id, item.id)}
        onAdd={() =>
          act('Add button', addItem(element.id, { label: 'Button', variant: 'secondary', action: { kind: 'next' } }))
        }
        onMove={(from, to) => act('Reorder buttons', moveItem(element.id, from, to))}
        onDelete={item => act('Delete button', deleteItem(element.id, item.id))}
        renderRow={item => (
          <>
            <RowInput
              label="Button label"
              field={`item:${item.id}:label`}
              max={LIMITS.button_label}
              value={item.label}
              onChange={value => editItem(element.id, item.id, ['label'], value)}
            />
            <SelectControl
              label="Look"
              value={item.variant ?? 'primary'}
              options={[
                { value: 'primary', label: 'Main' },
                { value: 'secondary', label: 'Secondary' },
                { value: 'outline', label: 'Outline' },
                { value: 'link', label: 'Text link' },
              ]}
              onChange={value => editItem(element.id, item.id, ['variant'], value)}
            />
            <ActionEditor
              action={item.action}
              screenId={screenId}
              port={`${element.id}:${item.id}`}
              onChange={action => editItem(element.id, item.id, ['action'], action)}
            />
          </>
        )}
      />
      <SegmentedControl
        label="Arrange"
        value={element.props.layout ?? 'auto'}
        options={[
          { value: 'auto', label: 'Automatic' },
          { value: 'stack', label: 'Stacked' },
          { value: 'row', label: 'Side by side' },
        ]}
        onChange={value => edit(element.id, ['props', 'layout'], value)}
      />
    </>
  )
}

function CardsContent({ element, screenId }: { element: Of<'cards'>; screenId: string }) {
  const items = element.props.items ?? []
  const selected = useSelectedItem(element.id)
  return (
    <>
      <ListEditor
        label="Cards"
        addLabel="Add card"
        items={items}
        max={LIMITS.max_items}
        min={1}
        selectedId={selected}
        onSelect={item => selectItem(screenId, element.id, item.id)}
        onAdd={() => act('Add card', addItem(element.id, { title: 'New card', text: '' }))}
        onMove={(from, to) => act('Reorder cards', moveItem(element.id, from, to))}
        onDelete={item => act('Delete card', deleteItem(element.id, item.id))}
        renderRow={item => (
          <>
            <RowInput
              label="Card title"
              field={`item:${item.id}:title`}
              max={LIMITS.card_title}
              value={item.title}
              onChange={value => editItem(element.id, item.id, ['title'], value)}
            />
            {selected === item.id ? (
              <div className="space-y-2">
                <TextControl
                  label="Description"
                  multiline
                  rows={2}
                  max={LIMITS.card_text}
                  value={item.text}
                  onChange={value => editItem(element.id, item.id, ['text'], value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <TextControl
                    label="Price"
                    max={LIMITS.price}
                    value={item.price}
                    onChange={value => editItem(element.id, item.id, ['price'], value || null)}
                  />
                  <TextControl
                    label="Badge"
                    max={LIMITS.badge}
                    value={item.badge}
                    onChange={value => editItem(element.id, item.id, ['badge'], value || null)}
                  />
                </div>
                <ImageField
                  label="Card image"
                  compact
                  src={item.image}
                  onPick={image => editItem(element.id, item.id, ['image'], image.src)}
                  onClear={() => editItem(element.id, item.id, ['image'], null)}
                />
                {item.image ? (
                  <TextControl
                    label="Describe the image"
                    max={LIMITS.alt_text}
                    value={item.imageAlt}
                    onChange={value => editItem(element.id, item.id, ['imageAlt'], value)}
                  />
                ) : null}
                {item.button ? (
                  <div className="space-y-2 rounded-md bg-slate-50 p-2">
                    <TextControl
                      label="Button label"
                      max={LIMITS.button_label}
                      value={item.button.label}
                      onChange={value => editItem(element.id, item.id, ['button', 'label'], value)}
                    />
                    <ActionEditor
                      action={item.button.action}
                      screenId={screenId}
                      port={`${element.id}:${item.id}`}
                      onChange={action => editItem(element.id, item.id, ['button', 'action'], action)}
                    />
                    <button
                      type="button"
                      className="text-xs text-rose-700"
                      onClick={() => editItem(element.id, item.id, ['button'], null)}
                    >
                      Remove button
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="text-xs font-medium text-indigo-700"
                    onClick={() =>
                      editItem(element.id, item.id, ['button'], { label: 'Choose', action: { kind: 'next' } })
                    }
                  >
                    Add a button
                  </button>
                )}
              </div>
            ) : null}
          </>
        )}
      />
      <SegmentedControl
        label="Arrange"
        value={element.props.layout ?? 'auto'}
        options={[
          { value: 'auto', label: 'Automatic' },
          { value: 'grid', label: 'Grid' },
          { value: 'carousel', label: 'Carousel' },
          { value: 'list', label: 'List' },
        ]}
        onChange={value => edit(element.id, ['props', 'layout'], value)}
      />
    </>
  )
}

function CountdownContent({ element }: { element: Of<'countdown'> }) {
  const props = element.props
  return (
    <>
      <DateTimeControl
        label="Ends at"
        field="deadline"
        value={props.deadline}
        onChange={iso => iso && edit(element.id, ['props', 'deadline'], iso)}
      />
      <SegmentedControl
        label="When time runs out"
        value={props.onExpire ?? 'hide'}
        options={[
          { value: 'hide', label: 'Hide timer' },
          { value: 'message', label: 'Show a message' },
        ]}
        onChange={value => edit(element.id, ['props', 'onExpire'], value)}
      />
      {props.onExpire === 'message' ? (
        <TextControl
          label="Message"
          max={LIMITS.text}
          value={props.message}
          onChange={value => edit(element.id, ['props', 'message'], value)}
        />
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        {(['days', 'hours', 'minutes', 'seconds'] as const).map(unit => (
          <TextControl
            key={unit}
            label={`Label for ${unit}`}
            max={LIMITS.countdown_label}
            value={props.labels?.[unit] ?? unit}
            onChange={value => edit(element.id, ['props', 'labels', unit], value)}
          />
        ))}
      </div>
    </>
  )
}

function SpacerContent({ element }: { element: Of<'spacer'> }) {
  return (
    <>
      <SegmentedControl
        label="Space"
        value={element.props.size ?? 'md'}
        options={[
          { value: 'sm', label: 'S' },
          { value: 'md', label: 'M' },
          { value: 'lg', label: 'L' },
          { value: 'xl', label: 'XL' },
        ]}
        onChange={value => edit(element.id, ['props', 'size'], value)}
      />
      <Switch
        label="Show a line"
        checked={element.props.line ?? false}
        onChange={v => edit(element.id, ['props', 'line'], v)}
      />
    </>
  )
}

function ChoiceContent({ element, screenId }: { element: Of<'choice'>; screenId: string }) {
  const props = element.props
  const options = props.options ?? []
  const selected = useSelectedItem(element.id)
  const add = (index?: number) =>
    act('Add option', addItem(element.id, { label: `Option ${options.length + 1}` }, index))
  return (
    <>
      <TextControl
        label="Question"
        field="question"
        max={LIMITS.question}
        value={props.question}
        onChange={value => edit(element.id, ['props', 'question'], value)}
      />
      <SelectControl
        label="Show as"
        value={props.display ?? 'list'}
        options={[
          { value: 'list', label: 'List' },
          { value: 'buttons', label: 'Buttons' },
          { value: 'pictures', label: 'Picture cards' },
          { value: 'dropdown', label: 'Dropdown' },
          { value: 'yesno', label: 'Yes / No' },
        ]}
        onChange={value => edit(element.id, ['props', 'display'], value)}
      />
      <ListEditor
        label="Options"
        addLabel="Add option"
        items={options}
        max={LIMITS.max_options}
        min={2}
        selectedId={selected}
        onSelect={item => selectItem(screenId, element.id, item.id)}
        onAdd={() => add()}
        onMove={(from, to) => act('Reorder options', moveItem(element.id, from, to))}
        onDelete={item => act('Delete option', deleteItem(element.id, item.id))}
        renderRow={(item, index) => (
          <>
            <RowInput
              label={`Option ${index + 1}`}
              field={`item:${item.id}:label`}
              max={LIMITS.option_label}
              value={item.label}
              onChange={value => editItem(element.id, item.id, ['label'], value)}
              onEnter={() => add(index + 1)}
              onBackspaceEmpty={
                options.length > 2 ? () => act('Delete option', deleteItem(element.id, item.id)) : undefined
              }
              onPasteLines={lines => act('Paste options', pasteItems(element.id, lines, 'label', LIMITS.option_label))}
            />
            {props.display === 'pictures' ? (
              <ImageField
                label="Picture"
                compact
                src={item.image}
                onPick={image => editItem(element.id, item.id, ['image'], image.src)}
                onClear={() => editItem(element.id, item.id, ['image'], null)}
              />
            ) : null}
            {props.scoring === 'points' ? (
              <NumberControl
                label="Points"
                min={-100}
                max={100}
                value={item.points ?? 0}
                onChange={value => editItem(element.id, item.id, ['points'], value ?? 0)}
              />
            ) : null}
            {props.scoring === 'outcomes' ? (
              <OutcomePicker elementId={element.id} itemId={item.id} value={item.outcome} />
            ) : null}
          </>
        )}
      />
      <Switch
        label="Allow several answers"
        checked={props.multiple ?? false}
        onChange={v => edit(element.id, ['props', 'multiple'], v)}
      />
      {props.multiple ? (
        <div className="grid grid-cols-2 gap-2">
          <NumberControl
            label="At least"
            min={0}
            max={options.length}
            value={props.min}
            onChange={v => edit(element.id, ['props', 'min'], v)}
          />
          <NumberControl
            label="At most"
            min={1}
            max={options.length}
            value={props.max}
            onChange={v => edit(element.id, ['props', 'max'], v)}
          />
        </div>
      ) : null}
      <Switch
        label="Add an “Other” option"
        checked={props.other ?? false}
        onChange={v => edit(element.id, ['props', 'other'], v)}
      />
      <Switch
        label="Shuffle options"
        checked={props.randomize ?? false}
        onChange={v => edit(element.id, ['props', 'randomize'], v)}
      />
      <Switch
        label="Required"
        checked={props.required ?? true}
        onChange={v => edit(element.id, ['props', 'required'], v)}
      />
    </>
  )
}

function OutcomePicker({
  elementId,
  itemId,
  value,
}: {
  elementId: string
  itemId: string
  value: string | null | undefined
}) {
  const all = useEditor(state => state.doc?.screens)
  const screens = Object.values(all ?? {})
  return (
    <SelectControl
      label="Recommends"
      value={value ?? ''}
      options={[
        { value: '', label: 'No result' },
        ...screens.map(screen => ({ value: screen.id, label: screen.name })),
      ]}
      onChange={next => editItem(elementId, itemId, ['outcome'], next || null)}
    />
  )
}

function RatingContent({ element }: { element: Of<'rating'> }) {
  const props = element.props
  return (
    <>
      <TextControl
        label="Question"
        field="question"
        max={LIMITS.question}
        value={props.question}
        onChange={value => edit(element.id, ['props', 'question'], value)}
      />
      <SelectControl
        label="Scale"
        value={props.scale ?? 'stars'}
        options={[
          { value: 'stars', label: 'Stars' },
          { value: 'emoji', label: 'Faces' },
          { value: 'numbers', label: 'Numbers' },
          { value: 'nps', label: 'Recommend score (0–10)' },
        ]}
        onChange={value =>
          act(
            'Change scale',
            updateElement(element.id, ['props'], {
              ...props,
              scale: value,
              max: value === 'nps' ? 10 : value === 'emoji' ? 5 : (props.max ?? 5),
            }),
          )
        }
      />
      {props.scale === 'stars' || props.scale === 'numbers' || !props.scale ? (
        <NumberControl
          label="Highest score"
          min={3}
          max={10}
          value={props.max ?? 5}
          onChange={v => edit(element.id, ['props', 'max'], v ?? 5)}
        />
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <TextControl
          label="Low label"
          max={LIMITS.rating_label}
          value={props.minLabel}
          onChange={v => edit(element.id, ['props', 'minLabel'], v || null)}
        />
        <TextControl
          label="High label"
          max={LIMITS.rating_label}
          value={props.maxLabel}
          onChange={v => edit(element.id, ['props', 'maxLabel'], v || null)}
        />
      </div>
      <Switch
        label="Required"
        checked={props.required ?? true}
        onChange={v => edit(element.id, ['props', 'required'], v)}
      />
    </>
  )
}

const FIELD_PRESETS: { kind: string; label: string; required: boolean; half?: boolean; unique?: boolean }[] = [
  { kind: 'name', label: 'Name', required: true },
  { kind: 'email', label: 'Email', required: true },
  { kind: 'phone', label: 'Phone', required: false },
  { kind: 'company', label: 'Company', required: false },
  { kind: 'text', label: 'Short answer', required: false },
  { kind: 'longtext', label: 'Long answer', required: false },
  { kind: 'number', label: 'Number', required: false },
  { kind: 'date', label: 'Date', required: false },
  { kind: 'dropdown', label: 'Dropdown', required: false },
  { kind: 'consent', label: 'Consent', required: true },
]

export function consentText(company: string | null | undefined, privacyUrl: string | null | undefined): string {
  const who = company?.trim() || 'us'
  const policy = privacyUrl ? ` See our [privacy policy](${privacyUrl}).` : ''
  return `I agree that ${who} may contact me about this offer.${policy}`.slice(0, LIMITS.consent_text)
}

function FormContent({ element, screenId }: { element: Of<'form'>; screenId: string }) {
  const props = element.props
  const fields = props.fields ?? []
  const selected = useSelectedItem(element.id)
  const legal = useEditor(state => state.doc?.settings?.legal)
  const addField = (kind: string) => {
    const preset = FIELD_PRESETS.find(p => p.kind === kind)
    if (!preset) return
    act(
      `Add ${preset.label.toLowerCase()} field`,
      addItem(element.id, {
        kind,
        label: kind === 'consent' ? 'Consent' : preset.label,
        key: slugifyKey(kind, allKeys(useEditor.getState().doc ?? { schemaVersion: 4 })),
        required: preset.required,
        half: false,
        ...(kind === 'dropdown' ? { options: ['Option 1', 'Option 2'] } : {}),
        ...(kind === 'consent' ? { consentText: consentText(legal?.company, legal?.privacyUrl) } : {}),
      }),
    )
  }
  return (
    <>
      <ListEditor
        label="Fields"
        addLabel="Add field"
        items={fields}
        max={LIMITS.max_fields}
        min={1}
        selectedId={selected}
        onSelect={item => selectItem(screenId, element.id, item.id)}
        onAdd={() => addField('text')}
        onMove={(from, to) => act('Reorder fields', moveItem(element.id, from, to))}
        onDelete={item => act('Delete field', deleteItem(element.id, item.id))}
        extraActions={
          <Menu
            align="start"
            trigger={
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
              >
                Add a ready-made field ▾
              </button>
            }
            items={FIELD_PRESETS.map(preset => ({ label: preset.label, onSelect: () => addField(preset.kind) }))}
          />
        }
        renderRow={item => (
          <>
            <RowInput
              label="Field label"
              field={`item:${item.id}:label`}
              max={LIMITS.field_label}
              value={item.label}
              onChange={value => editItem(element.id, item.id, ['label'], value)}
            />
            {selected === item.id ? (
              <div className="space-y-2">
                <SelectControl
                  label="Type"
                  value={item.kind}
                  options={FIELD_PRESETS.map(preset => ({ value: preset.kind, label: preset.label }))}
                  onChange={value => editItem(element.id, item.id, ['kind'], value)}
                />
                {item.kind === 'consent' ? (
                  <TextControl
                    label="Consent text"
                    multiline
                    max={LIMITS.consent_text}
                    value={item.consentText}
                    onChange={value => editItem(element.id, item.id, ['consentText'], value)}
                  />
                ) : (
                  <TextControl
                    label="Placeholder"
                    max={LIMITS.placeholder}
                    value={item.placeholder}
                    onChange={value => editItem(element.id, item.id, ['placeholder'], value || null)}
                  />
                )}
                {item.kind === 'dropdown' ? (
                  <TextControl
                    label="Choices (one per line)"
                    multiline
                    max={LIMITS.option_label * LIMITS.max_options}
                    value={(item.options ?? []).join('\n')}
                    onChange={value =>
                      editItem(
                        element.id,
                        item.id,
                        ['options'],
                        value
                          .split('\n')
                          .map(line => line.slice(0, LIMITS.option_label))
                          .slice(0, LIMITS.max_options),
                      )
                    }
                  />
                ) : null}
                <Switch
                  label="Required"
                  checked={item.required ?? false}
                  onChange={v => editItem(element.id, item.id, ['required'], v)}
                />
                <Switch
                  label="Half width on larger screens"
                  checked={item.half ?? false}
                  onChange={v => editItem(element.id, item.id, ['half'], v)}
                />
                {item.kind === 'email' || item.kind === 'phone' ? (
                  <Switch
                    label="Allow one entry per person"
                    checked={item.unique ?? false}
                    onChange={v => editItem(element.id, item.id, ['unique'], v)}
                  />
                ) : null}
              </div>
            ) : null}
          </>
        )}
      />
      <TextControl
        label="Submit button"
        max={LIMITS.button_label}
        value={props.submitLabel ?? 'Submit'}
        onChange={value => edit(element.id, ['props', 'submitLabel'], value)}
      />
      <Switch
        label="Fill in known answers"
        hint="Uses answers given earlier in the journey"
        checked={props.prefill ?? true}
        onChange={v => edit(element.id, ['props', 'prefill'], v)}
      />
      <p className="text-xs text-slate-500">
        Every submission is saved under Results. Choose where else it goes in Share › Settings.
      </p>
    </>
  )
}
