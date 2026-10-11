import { type Breakpoint, ExperienceRoot, ScreenView } from '@experience/index'
import { useEditor } from '../store'
import { DEVICE_LABEL, DeviceFrame } from './DeviceFrame'

const noop = () => undefined
const EMPTY = {}
const DEVICES: { device: Breakpoint; scale: number }[] = [
  { device: 'mobile', scale: 0.62 },
  { device: 'tablet', scale: 0.42 },
  { device: 'desktop', scale: 0.32 },
]

export function AllDevices({ screenId }: { screenId: string | null }) {
  const doc = useEditor(state => state.doc)
  if (!doc || !screenId || !doc.screens?.[screenId]) return null
  return (
    <div className="flex min-h-full flex-wrap items-start justify-center gap-8 px-6 py-10">
      {DEVICES.map(({ device, scale }) => (
        <button
          key={device}
          type="button"
          className="space-y-2 text-left"
          aria-label={`Edit on ${DEVICE_LABEL[device]}`}
          onClick={() => {
            useEditor.getState().setBreakpoint(device)
            useEditor.getState().setCanvas('screen')
          }}
        >
          <p className="text-xs font-medium text-slate-600">{DEVICE_LABEL[device]}</p>
          <div className="pointer-events-none">
            <DeviceFrame device={device} scale={scale}>
              <ExperienceRoot theme={doc.theme} breakpoint={device} style={{ flex: '1 1 auto' }}>
                {bp => (
                  <ScreenView
                    doc={doc}
                    screenId={screenId}
                    vars={EMPTY}
                    breakpoint={bp}
                    mode="thumbnail"
                    isFirst
                    onExit={noop}
                  />
                )}
              </ExperienceRoot>
            </DeviceFrame>
          </div>
        </button>
      ))}
    </div>
  )
}
