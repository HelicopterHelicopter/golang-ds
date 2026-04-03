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

export type QuadtreeInsertPhase = 'after_insert'

export type QuadtreeGraphNode = {
  id: string
  parentId: string
  minX: number
  minY: number
  maxX: number
  maxY: number
  depth: number
  childNW: string
  childNE: string
  childSW: string
  childSE: string
}

export type QuadtreeGraphPoint = {
  id: string
  x: number
  y: number
  leafId: string
}

export type QuadtreeGraphSnapshot = {
  bounds: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
  nodes: QuadtreeGraphNode[]
  points: QuadtreeGraphPoint[]
}

export type QuadtreeInsertStep = {
  phase: QuadtreeInsertPhase
  insertIndex: number
  lastPointId: string
  graph: QuadtreeGraphSnapshot
}

export type QuadtreeInsertTrace = {
  schemaVersion: number
  kind: 'quadtree-insert'
  meta: {
    capacity: number
    pointCount: number
    bounds: QuadtreeGraphSnapshot['bounds']
    maxDepth: number
  }
  steps: QuadtreeInsertStep[]
}

/** Discriminated union — add new data structures here. */
export type VizEnvelope = SkipListSearchTrace | QuadtreeInsertTrace

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
  if (kind === 'quadtree-insert') {
    const t = data as QuadtreeInsertTrace
    if (typeof t.schemaVersion !== 'number' || !Array.isArray(t.steps)) {
      throw new Error('Invalid quadtree-insert trace shape')
    }
    const meta = t.meta
    if (
      typeof meta !== 'object' ||
      meta === null ||
      typeof meta.capacity !== 'number' ||
      typeof meta.pointCount !== 'number' ||
      typeof meta.maxDepth !== 'number'
    ) {
      throw new Error('Invalid quadtree-insert meta')
    }
    return t
  }
  throw new Error(`Unknown trace kind: ${String(kind)}`)
}
