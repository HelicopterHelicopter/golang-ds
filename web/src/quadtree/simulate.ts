import type {
  QuadtreeGraphNode,
  QuadtreeGraphPoint,
  QuadtreeGraphSnapshot,
  QuadtreeInsertStep,
  QuadtreeInsertTrace,
} from '../types/trace'
import { TraceSchemaVersion } from './traceConstants'

export type Point = { x: number; y: number }
type Rect = { minX: number; minY: number; maxX: number; maxY: number }

const defaultMaxDepth = 32
const epsilon = 1e-9

function normalizeBounds(r: Rect): Rect {
  let { minX, minY, maxX, maxY } = r
  const dx = maxX - minX
  const dy = maxY - minY
  if (dx < epsilon) {
    const mid = (minX + maxX) * 0.5
    minX = mid - epsilon
    maxX = mid + epsilon
  }
  if (dy < epsilon) {
    const mid = (minY + maxY) * 0.5
    minY = mid - epsilon
    maxY = mid + epsilon
  }
  return { minX, minY, maxX, maxY }
}

export function boundsFromPoints(points: Point[], padFraction: number): Rect {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1 }
  }
  let minX = points[0].x
  let minY = points[0].y
  let maxX = minX
  let maxY = minY
  for (let i = 1; i < points.length; i++) {
    const p = points[i]
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  const pad = Math.max(0, padFraction)
  let w = maxX - minX
  let h = maxY - minY
  if (w < epsilon) w = epsilon
  if (h < epsilon) h = epsilon
  const padx = w * pad
  const pady = h * pad
  return normalizeBounds({
    minX: minX - padx,
    minY: minY - pady,
    maxX: maxX + padx,
    maxY: maxY + pady,
  })
}

function rectContains(r: Rect, p: Point): boolean {
  return p.x >= r.minX && p.x <= r.maxX && p.y >= r.minY && p.y <= r.maxY
}

type QNode = {
  bounds: Rect
  depth: number
  points: Point[]
  nw: QNode | null
  ne: QNode | null
  sw: QNode | null
  se: QNode | null
}

function isLeaf(n: QNode): boolean {
  return n.nw === null && n.ne === null && n.sw === null && n.se === null
}

class QuadtreeSim {
  readonly world: Rect
  readonly capacity: number
  maxDepth = defaultMaxDepth
  root: QNode

  constructor(world: Rect, capacity: number) {
    const cap = Math.max(1, capacity)
    this.world = normalizeBounds(world)
    this.capacity = cap
    this.root = {
      bounds: this.world,
      depth: 0,
      points: [],
      nw: null,
      ne: null,
      sw: null,
      se: null,
    }
  }

  insert(p: Point): boolean {
    if (!rectContains(this.world, p)) return false
    return this.insertInto(this.root, p)
  }

  private insertInto(n: QNode, p: Point): boolean {
    if (!rectContains(n.bounds, p)) return false
    if (isLeaf(n)) {
      if (n.points.length < this.capacity || n.depth >= this.maxDepth) {
        n.points = [...n.points, p]
        return true
      }
      const pts = [...n.points, p]
      n.points = []
      this.subdivide(n)
      for (const q of pts) {
        const child = this.childForPoint(n, q)
        if (child === null) {
          n.points.push(q)
        } else {
          this.insertInto(child, q)
        }
      }
      return true
    }
    const child = this.childForPoint(n, p)
    if (child === null) return false
    return this.insertInto(child, p)
  }

  private subdivide(n: QNode): void {
    const b = n.bounds
    const midX = (b.minX + b.maxX) * 0.5
    const midY = (b.minY + b.maxY) * 0.5
    const depth = n.depth + 1
    n.nw = {
      bounds: { minX: b.minX, minY: b.minY, maxX: midX, maxY: midY },
      depth,
      points: [],
      nw: null,
      ne: null,
      sw: null,
      se: null,
    }
    n.ne = {
      bounds: { minX: midX, minY: b.minY, maxX: b.maxX, maxY: midY },
      depth,
      points: [],
      nw: null,
      ne: null,
      sw: null,
      se: null,
    }
    n.sw = {
      bounds: { minX: b.minX, minY: midY, maxX: midX, maxY: b.maxY },
      depth,
      points: [],
      nw: null,
      ne: null,
      sw: null,
      se: null,
    }
    n.se = {
      bounds: { minX: midX, minY: midY, maxX: b.maxX, maxY: b.maxY },
      depth,
      points: [],
      nw: null,
      ne: null,
      sw: null,
      se: null,
    }
  }

  private childForPoint(n: QNode, p: Point): QNode | null {
    const b = n.bounds
    const midX = (b.minX + b.maxX) * 0.5
    const midY = (b.minY + b.maxY) * 0.5
    const left = p.x < midX
    const top = p.y < midY
    if (top) return left ? n.nw : n.ne
    return left ? n.sw : n.se
  }
}

function assignIDs(root: QNode | null): Map<QNode, string> {
  const idFor = new Map<QNode, string>()
  let next = 0
  const walk = (n: QNode | null) => {
    if (n === null) return
    idFor.set(n, `c${next++}`)
    walk(n.nw)
    walk(n.ne)
    walk(n.sw)
    walk(n.se)
  }
  walk(root)
  return idFor
}

function buildGraphNodes(
  root: QNode | null,
  idFor: Map<QNode, string>,
): QuadtreeGraphNode[] {
  const nodes: QuadtreeGraphNode[] = []
  const build = (n: QNode | null, parentId: string) => {
    if (n === null) return
    const id = idFor.get(n) ?? ''
    const gn: QuadtreeGraphNode = {
      id,
      parentId,
      minX: n.bounds.minX,
      minY: n.bounds.minY,
      maxX: n.bounds.maxX,
      maxY: n.bounds.maxY,
      depth: n.depth,
      childNW: n.nw ? idFor.get(n.nw) ?? '' : '',
      childNE: n.ne ? idFor.get(n.ne) ?? '' : '',
      childSW: n.sw ? idFor.get(n.sw) ?? '' : '',
      childSE: n.se ? idFor.get(n.se) ?? '' : '',
    }
    nodes.push(gn)
    build(n.nw, id)
    build(n.ne, id)
    build(n.sw, id)
    build(n.se, id)
  }
  build(root, '')
  return nodes
}

function childForPointStatic(n: QNode, p: Point): QNode | null {
  const b = n.bounds
  const midX = (b.minX + b.maxX) * 0.5
  const midY = (b.minY + b.maxY) * 0.5
  const left = p.x < midX
  const top = p.y < midY
  if (top) return left ? n.nw : n.ne
  return left ? n.sw : n.se
}

function findLeaf(root: QNode | null, p: Point): QNode | null {
  let n: QNode | null = root
  while (n !== null && !isLeaf(n)) {
    const ch = childForPointStatic(n, p)
    if (ch === null) return n
    n = ch
  }
  return n
}

function snapshotInsertTrace(qt: QuadtreeSim, inserted: Point[]): QuadtreeGraphSnapshot {
  const idFor = assignIDs(qt.root)
  const nodes = buildGraphNodes(qt.root, idFor)
  const points: QuadtreeGraphPoint[] = inserted.map((p, i) => {
    const leaf = findLeaf(qt.root, p)
    return {
      id: `p${i}`,
      x: p.x,
      y: p.y,
      leafId: leaf ? idFor.get(leaf) ?? '' : '',
    }
  })
  return {
    bounds: qt.world,
    nodes,
    points,
  }
}

export function buildQuadtreeInsertTrace(
  points: Point[],
  capacity: number,
  padFraction: number,
): QuadtreeInsertTrace {
  if (points.length === 0) {
    const b = boundsFromPoints([], padFraction)
    return {
      schemaVersion: TraceSchemaVersion,
      kind: 'quadtree-insert',
      meta: {
        capacity,
        pointCount: 0,
        bounds: b,
        maxDepth: defaultMaxDepth,
      },
      steps: [],
    }
  }
  const world = boundsFromPoints(points, padFraction)
  const steps: QuadtreeInsertStep[] = []
  for (let i = 0; i < points.length; i++) {
    const qt = new QuadtreeSim(world, capacity)
    for (let j = 0; j <= i; j++) {
      qt.insert(points[j])
    }
    steps.push({
      phase: 'after_insert',
      insertIndex: i,
      lastPointId: `p${i}`,
      graph: snapshotInsertTrace(qt, points.slice(0, i + 1)),
    })
  }
  return {
    schemaVersion: TraceSchemaVersion,
    kind: 'quadtree-insert',
    meta: {
      capacity,
      pointCount: points.length,
      bounds: world,
      maxDepth: defaultMaxDepth,
    },
    steps,
  }
}

/** Parse "x,y" lines or comma-separated pairs. */
export function parsePointList(input: string): Point[] {
  const out: Point[] = []
  const chunks = input
    .split(/[\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  for (const chunk of chunks) {
    const parts = chunk.split(',').map((s) => s.trim())
    if (parts.length < 2) continue
    const x = Number(parts[0])
    const y = Number(parts[1])
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`"${chunk}" is not a valid x,y pair`)
    }
    out.push({ x, y })
  }
  if (out.length === 0) {
    throw new Error('Add at least one x,y point (e.g. 10, 20).')
  }
  return out
}
