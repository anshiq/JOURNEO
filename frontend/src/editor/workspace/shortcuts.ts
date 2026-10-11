import { deleteElement, deleteScreen, duplicateElement, duplicateScreen, moveElement } from '@journey/ops/index'
import { useEffect } from 'react'
import { useEditor } from '../store'
import { copySelection, pasteIntoSelection } from '../store/clipboard'
import { act, findElement } from '../store/commands'

function typing(target: EventTarget | null): boolean {
  const node = target as HTMLElement | null
  if (!node) return false
  return node.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName)
}

export function useShortcuts(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    const onKey = (event: KeyboardEvent) => {
      const state = useEditor.getState()
      if (state.playing || state.panel) return
      const mod = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()
      if (mod && key === 'z' && !typing(event.target)) {
        event.preventDefault()
        if (event.shiftKey) state.redo()
        else state.undo()
        return
      }
      if (mod && key === 'y' && !typing(event.target)) {
        event.preventDefault()
        state.redo()
        return
      }
      if (typing(event.target)) return
      const selection = state.selection
      const doc = state.doc
      if (!doc) return
      if (mod && key === 'd') {
        event.preventDefault()
        if (selection.kind === 'element' || selection.kind === 'item')
          act('Duplicate element', duplicateElement(selection.elementId))
        else if (selection.kind === 'screen') act('Duplicate screen', duplicateScreen(selection.screenId))
        return
      }
      if (mod && key === 'c') {
        if (copySelection()) event.preventDefault()
        return
      }
      if (mod && key === 'x') {
        if ((selection.kind === 'element' || selection.kind === 'item') && copySelection()) {
          event.preventDefault()
          act('Cut element', deleteElement(selection.elementId))
        }
        return
      }
      if (mod && key === 'v') {
        event.preventDefault()
        void pasteIntoSelection()
        return
      }
      if (key === 'delete' || key === 'backspace') {
        if (selection.kind === 'element' || selection.kind === 'item') {
          event.preventDefault()
          act('Delete element', deleteElement(selection.elementId))
        } else if (selection.kind === 'screen' && Object.keys(doc.screens ?? {}).length > 1) {
          event.preventDefault()
          act('Delete screen', deleteScreen(selection.screenId))
        }
        return
      }
      if (
        event.altKey &&
        (key === 'arrowup' || key === 'arrowdown') &&
        (selection.kind === 'element' || selection.kind === 'item')
      ) {
        const found = findElement(doc, selection.elementId)
        if (!found) return
        event.preventDefault()
        act(
          'Move element',
          moveElement(selection.elementId, found.screen.id, found.index + (key === 'arrowup' ? -1 : 1)),
        )
        return
      }
      if (key === 'p' && !mod) {
        const screenId =
          selection.kind === 'screen' || selection.kind === 'element' || selection.kind === 'item'
            ? selection.screenId
            : null
        state.play(screenId)
        return
      }
      if (key === 'escape' && (selection.kind === 'element' || selection.kind === 'item'))
        state.select({ kind: 'screen', screenId: selection.screenId })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
