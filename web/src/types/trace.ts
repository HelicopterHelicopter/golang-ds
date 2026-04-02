export type SearchPhase =
  | 'at_level'
  | 'scan_forward'
  | 'end_of_level'
  | 'final_check'
  | 'done'

export type GraphNode = {
  id: string
  value: string
  height: number
}

export type GraphEdge = {
  level: number
  from: string
  to: string
}

export type GraphSnapshot = {
  listLevel: number
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export type SearchStep = {
  activeLevel: number
  cursorNodeId: string
  phase: SearchPhase
  graph: GraphSnapshot
}

export type SkipListSearchTrace = {
  schemaVersion: number
  kind: 'skiplist-search'
  meta: {
    targetValue: string
    found: boolean
  }
  steps: SearchStep[]
}

/** Discriminated union — add new data structures here. */
export type VizEnvelope = SkipListSearchTrace

export function parseVizEnvelope(data: unknown): VizEnvelope {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Trace must be a JSON object')
  }
  const o = data as Record<string, unknown>
  const kind = o.kind
  if (kind === 'skiplist-search') {
    const t = data as SkipListSearchTrace
    if (typeof t.schemaVersion !== 'number' || !Array.isArray(t.steps)) {
      throw new Error('Invalid skiplist-search trace shape')
    }
    return t
  }
  throw new Error(`Unknown trace kind: ${String(kind)}`)
}
