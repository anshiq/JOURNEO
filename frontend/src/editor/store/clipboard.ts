import {
  CLIPBOARD_MIME,
  type ClipboardPayload,
  copyElement,
  isClipboardPayload,
  pasteElement,
} from '@journey/ops/index'
import { toast } from 'sonner'
import { act, findElement } from './commands'
import { useEditor } from './index'

let memory: ClipboardPayload | null = null

export function copySelection(): boolean {
  const { doc, selection } = useEditor.getState()
  if (!doc || (selection.kind !== 'element' && selection.kind !== 'item')) return false
  const payload = copyElement(doc, selection.elementId)
  if (!payload) return false
  memory = payload
  const text = JSON.stringify(payload)
  if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
    const item = new ClipboardItem({ 'text/plain': new Blob([text], { type: 'text/plain' }) })
    void navigator.clipboard.write([item]).catch(() => undefined)
  }
  return true
}

export async function pasteIntoSelection(): Promise<boolean> {
  const { doc, selection } = useEditor.getState()
  if (!doc) return false
  let payload = memory
  try {
    const text = await navigator.clipboard.readText()
    const parsed: unknown = JSON.parse(text)
    if (isClipboardPayload(parsed)) payload = parsed
  } catch {
    payload = memory
  }
  if (!payload) return false
  let screenId: string | null = null
  let index = 0
  if (selection.kind === 'element' || selection.kind === 'item') {
    const found = findElement(doc, selection.elementId)
    if (found) {
      screenId = found.screen.id
      index = found.index + 1
    }
  } else if (selection.kind === 'screen') {
    screenId = selection.screenId
    index = doc.screens?.[screenId]?.elements?.length ?? 0
  }
  if (!screenId) {
    toast('Select a screen to paste into')
    return false
  }
  act('Paste', pasteElement(screenId, index, payload))
  return true
}

export { CLIPBOARD_MIME }
