import { insertElement } from '@journey/ops/index'
import { screenPorts } from '@journey/ports'
import { DestinationPicker } from '../inspector/widgets/DestinationPicker'
import { useEditor } from '../store'
import { act } from '../store/commands'
import { Button } from '../ui/Button'

export function AfterScreen({ screenId }: { screenId: string }) {
  const screen = useEditor(state => state.doc?.screens?.[screenId])
  if (!screen) return null
  const ports = screenPorts(screen)
  if (ports.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium">Ends here</span>
        <Button
          size="sm"
          onClick={() =>
            act(
              'Add button',
              insertElement(screenId, screen.elements?.length ?? 0, {
                type: 'buttons',
                props: { items: [{ label: 'Continue', variant: 'primary', action: { kind: 'next' } }], layout: 'auto' },
              }),
            )
          }
        >
          Add a Continue button
        </Button>
      </div>
    )
  }
  return (
    <div className="flex w-full max-w-sm items-center gap-2 text-sm text-slate-600">
      <span className="shrink-0">After this screen</span>
      <div className="min-w-0 flex-1">
        <DestinationPicker stepId={screenId} port="next" fallback={null} allowCondition />
      </div>
    </div>
  )
}
