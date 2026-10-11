import { useEffect, useRef } from 'react'
import { ThemePanel } from '../design/ThemePanel'
import { useEditor } from '../store'
import { Empty } from '../ui/Empty'
import { ElementInspector } from './ElementInspector'
import { ScreenInspector } from './ScreenInspector'
import { StepInspector } from './StepInspector'

export function Inspector() {
  const selection = useEditor(state => state.selection)
  const tab = useEditor(state => state.tab)
  const isScreenStep = useEditor(state =>
    state.selection.kind === 'step' ? Boolean(state.doc?.screens?.[state.selection.stepId]) : false,
  )
  const focus = useEditor(state => state.focus)
  const root = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!focus) return
    const timer = window.setTimeout(() => {
      const target = root.current?.querySelector<HTMLElement>(`[data-field="${CSS.escape(focus.field)}"]`)
      if (target) {
        target.scrollIntoView({ block: 'center' })
        target.focus()
      }
    }, 60)
    return () => window.clearTimeout(timer)
  }, [focus])
  let content: React.ReactNode
  if (tab === 'design' || selection.kind === 'theme') content = <ThemePanel />
  else if (selection.kind === 'element' || selection.kind === 'item')
    content = <ElementInspector key={selection.elementId} elementId={selection.elementId} />
  else if (selection.kind === 'screen')
    content = <ScreenInspector key={selection.screenId} screenId={selection.screenId} />
  else if (selection.kind === 'step')
    content = isScreenStep ? (
      <ScreenInspector screenId={selection.stepId} />
    ) : (
      <StepInspector key={selection.stepId} stepId={selection.stepId} />
    )
  else
    content = (
      <div className="p-4">
        <Empty title="Nothing selected">Click anything on the screen to change it.</Empty>
      </div>
    )
  return (
    <aside
      ref={root}
      aria-label="Inspector"
      className="flex h-full min-h-0 w-80 shrink-0 flex-col border-l border-slate-200 bg-white"
    >
      {content}
    </aside>
  )
}
