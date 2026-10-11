import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  type Modifier,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { EditBridgeContext, ExperienceRoot, ScreenView } from '@experience/index'
import { moveElement } from '@journey/ops/index'
import { useMemo } from 'react'
import { useEditor } from '../store'
import { act, useIndex } from '../store/commands'
import { Empty } from '../ui/Empty'
import { AfterScreen } from './AfterScreen'
import { canvasBridge } from './bridge'
import { DeviceFrame, useFitScale } from './DeviceFrame'
import { useResponsiveWarnings } from './warnings'

const noop = () => undefined
const EMPTY_VARS = {}

export function ScreenCanvas({ screenId, available }: { screenId: string | null; available: number }) {
  const doc = useEditor(state => state.doc)
  const breakpoint = useEditor(state => state.breakpoint)
  const index = useIndex()
  const scale = useFitScale(breakpoint, available)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const unscale = useMemo<Modifier>(
    () =>
      ({ transform }) => ({ ...transform, x: transform.x / scale, y: transform.y / scale }),
    [scale],
  )
  const screen = screenId ? doc?.screens?.[screenId] : undefined
  const frameRef = useResponsiveWarnings(screenId, breakpoint)
  if (!doc || !screen || !screenId) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Empty title="Pick a screen">Choose a screen on the left, or add a new one.</Empty>
      </div>
    )
  }
  const ids = (screen.elements ?? []).map(el => el.id)
  const reachable = Object.keys(doc.screens ?? {})
    .filter(id => index?.reachable.has(id))
    .sort((a, b) => (index?.order[a] ?? 0) - (index?.order[b] ?? 0))
  const position = reachable.indexOf(screenId)
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const to = ids.indexOf(String(over.id))
    if (to >= 0) act('Move element', moveElement(String(active.id), screenId, to))
  }
  return (
    <div className="flex min-h-full flex-col items-center gap-3 px-6 pt-12 pb-16">
      <p className="text-xs text-slate-500">
        {screen.name}
        {position >= 0 ? ` · Screen ${position + 1} of ${reachable.length}` : ' · Not connected'}
      </p>
      <div
        ref={frameRef}
        onClick={() => useEditor.getState().select({ kind: 'screen', screenId })}
        onKeyDown={event => {
          if (event.key === 'Escape') useEditor.getState().select({ kind: 'screen', screenId })
        }}
        role="group"
        aria-label="Screen preview"
      >
        <DeviceFrame device={breakpoint} scale={scale}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[unscale]}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <EditBridgeContext.Provider value={canvasBridge}>
                <ExperienceRoot theme={doc.theme} breakpoint={breakpoint} style={{ flex: '1 1 auto' }}>
                  {bp => (
                    <ScreenView
                      doc={doc}
                      screenId={screenId}
                      vars={EMPTY_VARS}
                      breakpoint={bp}
                      mode="edit"
                      isFirst
                      progress={doc.settings?.progress === 'none' ? null : 0.4}
                      onExit={noop}
                    />
                  )}
                </ExperienceRoot>
              </EditBridgeContext.Provider>
            </SortableContext>
          </DndContext>
        </DeviceFrame>
      </div>
      <AfterScreen screenId={screenId} />
    </div>
  )
}
