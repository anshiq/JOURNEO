export type NodeType='trigger'|'message'|'condition'|'ai_decision'|'action'|'subflow_ref'|'end'
export type GraphNode={id:string; type:NodeType; position:{x:number;y:number}; data:any; config?:any}
export type GraphEdge={id:string; source:string; target:string; sourceHandle?:string; label?:string}
