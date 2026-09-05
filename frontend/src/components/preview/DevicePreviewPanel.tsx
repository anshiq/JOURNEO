import PreviewContainer from './PreviewContainer'
import type { FlowEdge, FlowNode } from './types'
export default function DevicePreviewPanel({ nodes, edges }: { nodes: FlowNode[]; edges: FlowEdge[] }) {
  return <PreviewContainer nodes={nodes} edges={edges} studio />
}
