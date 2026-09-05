import type { Screen, AdvanceMode } from '../../lib/journeyGraph'
import type { Breakpoint } from '../../nodes/_core/types'
import { Card } from '../ui/Card'

const fieldClass =
  'w-full border border-border/60 bg-background px-1.5 py-1 text-[11px] text-foreground/80 focus:border-foreground focus:outline-none'
const selectClass = fieldClass
const labelClass = 'mb-0.5 block text-[10px] uppercase tracking-wide text-muted-foreground'
const rowClass = 'grid grid-cols-2 gap-2'

export default function ScreenPropertiesPanel({
  screen,
  onChange,
  readOnly,
  previewBreakpoint,
  onPreviewBreakpointChange,
}: {
  screen: Screen
  onChange: (next: Screen) => void
  readOnly?: boolean
  previewBreakpoint?: Breakpoint
  onPreviewBreakpointChange?: (bp: Breakpoint) => void
}) {
  const set = (patch: Partial<Screen>) => {
    if (readOnly) return
    onChange({ ...screen, ...patch })
  }
  const setLayout = (patch: Partial<Screen['layout']>) => {
    if (readOnly) return
    onChange({ ...screen, layout: { ...screen.layout, ...patch } })
  }
  const setAdvance = (patch: Partial<Screen['advance']>) => {
    if (readOnly) return
    onChange({ ...screen, advance: { ...screen.advance, ...patch } })
  }
  const setBack = (patch: Partial<Screen['back']>) => {
    if (readOnly) return
    onChange({ ...screen, back: { ...screen.back, ...patch } })
  }
  return (
    <Card className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto p-2 text-[11px]">
      <div className="text-eyebrow text-muted-foreground">Screen properties</div>

      {onPreviewBreakpointChange && (
        <div>
          <span className={labelClass}>Preview device</span>
          <div className="grid grid-cols-3 gap-1">
            {(['mobile', 'tablet', 'desktop'] as Breakpoint[]).map(bp => (
              <button
                key={bp}
                type="button"
                onClick={() => onPreviewBreakpointChange(bp)}
                className={
                  (previewBreakpoint || 'desktop') === bp
                    ? 'border border-foreground bg-foreground px-1.5 py-1 text-[11px] capitalize text-background'
                    : 'border border-border/60 bg-background px-1.5 py-1 text-[11px] capitalize text-foreground/80'
                }
              >
                {bp}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <span className={labelClass}>Name</span>
        <input className={fieldClass} value={screen.name} disabled={readOnly} onChange={(e) => set({ name: e.target.value })} />
      </div>

      <div>
        <span className={labelClass}>Size mode</span>
        <select
          className={selectClass}
          value={screen.sizeMode || 'fixed'}
          disabled={readOnly}
          onChange={(e) => set({ sizeMode: e.target.value as Screen['sizeMode'] })}
        >
          <option value="fixed">Fixed (device frame)</option>
          <option value="viewport">Fill viewport (100dvh / 100dvw)</option>
        </select>
      </div>

      {(screen.sizeMode || 'fixed') === 'fixed' && (
        <div className={rowClass}>
          <div>
            <span className={labelClass}>Width</span>
            <input
              type="number"
              className={fieldClass}
              value={screen.size.width}
              disabled={readOnly}
              onChange={(e) => set({ size: { ...screen.size, width: Number(e.target.value) } })}
            />
          </div>
          <div>
            <span className={labelClass}>Height</span>
            <input
              type="number"
              className={fieldClass}
              value={screen.size.height}
              disabled={readOnly}
              onChange={(e) => set({ size: { ...screen.size, height: Number(e.target.value) } })}
            />
          </div>
        </div>
      )}

      <div className="border-t border-border/60 pt-2 text-eyebrow text-muted-foreground">Layout</div>
      <div className={rowClass}>
        <div>
          <span className={labelClass}>Mode</span>
          <select className={selectClass} value={screen.layout.mode} disabled={readOnly} onChange={(e) => setLayout({ mode: e.target.value as any })}>
            <option value="stack">Stack</option>
            <option value="grid">Grid</option>
          </select>
        </div>
        <div>
          <span className={labelClass}>Direction</span>
          <select className={selectClass} value={screen.layout.direction} disabled={readOnly} onChange={(e) => setLayout({ direction: e.target.value as any })}>
            <option value="column">Column</option>
            <option value="row">Row</option>
          </select>
        </div>
        <div>
          <span className={labelClass}>Align</span>
          <select className={selectClass} value={screen.layout.align} disabled={readOnly} onChange={(e) => setLayout({ align: e.target.value as any })}>
            <option value="start">Start</option>
            <option value="center">Center</option>
            <option value="end">End</option>
            <option value="stretch">Stretch</option>
          </select>
        </div>
        <div>
          <span className={labelClass}>Justify</span>
          <select className={selectClass} value={screen.layout.justify} disabled={readOnly} onChange={(e) => setLayout({ justify: e.target.value as any })}>
            <option value="start">Start</option>
            <option value="center">Center</option>
            <option value="end">End</option>
            <option value="between">Between</option>
            <option value="around">Around</option>
          </select>
        </div>
        <div>
          <span className={labelClass}>Gap</span>
          <input className={fieldClass} value={screen.layout.gap} disabled={readOnly} onChange={(e) => setLayout({ gap: e.target.value })} />
        </div>
        <div>
          <span className={labelClass}>Padding</span>
          <input className={fieldClass} value={screen.layout.padding} disabled={readOnly} onChange={(e) => setLayout({ padding: e.target.value })} />
        </div>
        <div>
          <span className={labelClass}>Scroll</span>
          <select className={selectClass} value={screen.layout.scroll} disabled={readOnly} onChange={(e) => setLayout({ scroll: e.target.value as any })}>
            <option value="auto">Auto</option>
            <option value="hidden">Hidden</option>
            <option value="paged">Paged (snap)</option>
          </select>
        </div>
        <div>
          <span className={labelClass}>Scrollbar</span>
          <select className={selectClass} value={screen.layout.scrollbar || 'auto'} disabled={readOnly} onChange={(e) => setLayout({ scrollbar: e.target.value as any })}>
            <option value="auto">Auto (native)</option>
            <option value="thin">Thin</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
      </div>

      <div className="border-t border-border/60 pt-2 text-eyebrow text-muted-foreground">Advance</div>
      <div className={rowClass}>
        <div>
          <span className={labelClass}>Mode</span>
          <select
            className={selectClass}
            value={screen.advance.mode}
            disabled={readOnly}
            onChange={(e) => setAdvance({ mode: e.target.value as AdvanceMode })}
          >
            <option value="button">Button</option>
            <option value="auto">Auto (timer)</option>
            <option value="block">Block-driven (no bar)</option>
            <option value="none">None</option>
          </select>
        </div>
        <div>
          <span className={labelClass}>Variant</span>
          <select className={selectClass} value={screen.advance.variant} disabled={readOnly} onChange={(e) => setAdvance({ variant: e.target.value as any })}>
            <option value="solid">Solid</option>
            <option value="outline">Outline</option>
            <option value="ghost">Ghost</option>
          </select>
        </div>
        <div className="col-span-2">
          <span className={labelClass}>Label</span>
          <input className={fieldClass} value={screen.advance.label} disabled={readOnly} onChange={(e) => setAdvance({ label: e.target.value })} />
        </div>
        <div>
          <span className={labelClass}>Gesture</span>
          <select className={selectClass} value={screen.advance.gesture || 'none'} disabled={readOnly} onChange={(e) => setAdvance({ gesture: e.target.value as any })}>
            <option value="none">None</option>
            <option value="swipe-up">Swipe up</option>
            <option value="tap-anywhere">Tap anywhere</option>
          </select>
        </div>
        <div className="flex items-end gap-1">
          <label className="flex items-center gap-1 text-[11px]">
            <input
              type="checkbox"
              checked={screen.advance.requireValid}
              disabled={readOnly}
              onChange={(e) => setAdvance({ requireValid: e.target.checked })}
            />
            Require valid
          </label>
        </div>
      </div>

      <div className="border-t border-border/60 pt-2 text-eyebrow text-muted-foreground">Back</div>
      <div className={rowClass}>
        <label className="flex items-center gap-1 text-[11px]">
          <input type="checkbox" checked={screen.back.show} disabled={readOnly} onChange={(e) => setBack({ show: e.target.checked })} />
          Show back button
        </label>
        <div>
          <span className={labelClass}>Label</span>
          <input className={fieldClass} value={screen.back.label} disabled={readOnly} onChange={(e) => setBack({ label: e.target.value })} />
        </div>
      </div>

      <div>
        <span className={labelClass}>Timeout (seconds)</span>
        <input
          type="number"
          className={fieldClass}
          value={screen.timeoutSeconds ?? ''}
          disabled={readOnly}
          onChange={(e) => set({ timeoutSeconds: e.target.value === '' ? undefined : Number(e.target.value) })}
        />
      </div>
    </Card>
  )
}
