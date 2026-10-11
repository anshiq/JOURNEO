import { updateScreen } from '@journey/ops/index'
import type { Issue } from '../queries/types'
import { useEditor } from '../store'
import { act, findElement } from '../store/commands'

export function issueKey(issue: Issue): string {
  return `${issue.code}:${issue.target.id}:${issue.target.itemId ?? ''}:${issue.target.field ?? ''}`
}

export function applyFix(issue: Issue): void {
  const state = useEditor.getState()
  const doc = state.doc
  if (!doc) return
  const target = issue.target
  if (issue.fix?.kind === 'raise_darken' && target.screenId) {
    const darken = doc.screens?.[target.screenId]?.layout?.media?.darken ?? 40
    act(
      'Raise darken',
      updateScreen(target.screenId, ['layout', 'media', 'darken'], Math.min(80, Math.max(45, darken + 20))),
    )
    return
  }
  state.setTab(target.kind === 'theme' ? 'design' : target.kind === 'assistant' ? 'chat' : 'build')
  state.setCanvas('screen')
  switch (target.kind) {
    case 'element': {
      const found = findElement(doc, target.id)
      if (found) state.select({ kind: 'element', screenId: found.screen.id, elementId: target.id })
      break
    }
    case 'item': {
      const elementId = target.id
      const found = findElement(doc, elementId)
      if (found && target.itemId)
        state.select({ kind: 'item', screenId: found.screen.id, elementId, itemId: target.itemId })
      else if (found) state.select({ kind: 'element', screenId: found.screen.id, elementId })
      break
    }
    case 'screen':
      if (doc.screens?.[target.id]) state.select({ kind: 'screen', screenId: target.id })
      break
    case 'step':
      if (doc.screens?.[target.id]) state.select({ kind: 'screen', screenId: target.id })
      else state.select({ kind: 'step', stepId: target.id })
      break
    case 'theme':
      state.select({ kind: 'theme' })
      break
    case 'settings':
      state.setPanel('settings')
      break
    default:
      break
  }
  const field = target.itemId && target.field ? `item:${target.itemId}:${target.field}` : target.field
  if (target.kind === 'step' && target.field?.startsWith('rule')) state.focusField(target.field)
  else if (field) state.focusField(field)
}
