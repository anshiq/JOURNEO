import { evaluate, type Vars } from '@journey/engine/index'
import type { Element, JourneyDoc } from '@journey/model/types'
import { cn } from '../classnames'
import type { Breakpoint } from '../constants'
import { registry } from '../elements/registry'
import type { ElementComponent } from '../elements/types'
import { isHiddenAt, resolveStyle } from '../responsive/resolve'
import * as s from '../styles/elements.css'
import { useEditBridge } from './EditBridge'
import type { RenderMode } from './runtime'

export function isVisible(element: Element, doc: JourneyDoc, vars: Vars, bp: Breakpoint): boolean {
  if (isHiddenAt(element, bp)) return false
  if (element.visibleIf && !evaluate(element.visibleIf, vars, doc)) return false
  return true
}

export function ElementView({
  element,
  doc,
  vars,
  breakpoint,
  mode,
  labels,
  screenId,
}: {
  screenId: string
  element: Element
  doc: JourneyDoc
  vars: Vars
  breakpoint: Breakpoint
  mode: RenderMode
  labels: Record<string, string>
}) {
  const bridge = useEditBridge()
  const visible = isVisible(element, doc, vars, breakpoint)
  if (!visible && mode !== 'edit') return null
  const style = resolveStyle(element, breakpoint)
  const Component = registry[element.type] as ElementComponent
  const node = (
    <div
      data-element-id={element.id}
      data-element-type={element.type}
      className={cn(
        s.element,
        style.align && s.align[style.align],
        style.emphasis && s.emphasis[style.emphasis],
        style.width && s.elementWidth[style.width],
        style.colorRole && s.colorRole[style.colorRole],
        style.spacingBefore && s.spaceBefore[style.spacingBefore],
        style.spacingAfter && s.spaceAfter[style.spacingAfter],
        !visible && s.ghost,
      )}
    >
      <Component element={element} style={style} labels={labels} />
    </div>
  )
  return bridge && mode === 'edit' ? bridge.wrapElement(element, screenId, node, { visible }) : node
}
