import type { EditBridge } from '@experience/index'
import { EditableElement } from './EditableElement'
import { CanvasText } from './InlineText'
import { InsertPoint } from './InsertPoint'

export const canvasBridge: EditBridge = {
  wrapElement: (element, screenId, children, state) => (
    <EditableElement key={element.id} element={element} screenId={screenId} visible={state.visible}>
      {children}
    </EditableElement>
  ),
  renderInsert: (screenId, index) => <InsertPoint key={`insert-${index}`} screenId={screenId} index={index} />,
  renderText: text => <CanvasText {...text} />,
}
