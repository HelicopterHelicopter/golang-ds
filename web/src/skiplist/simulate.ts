import type {
  GraphEdge,
  GraphNode,
  GraphSnapshot,
  SearchPhase,
  SearchStep,
  SkipListSearchTrace,
} from '../types/trace'
import { TraceSchemaVersion } from './traceConstants'

const defaultMaxLevel = 32
const defaultProbability = 0.5

export type SimNode = {
  value: number | null
  forward: (SimNode | null)[]
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

class IdGen {
  private readonly m = new Map<SimNode, string>()
  private next = 0

  id(head: SimNode, n: SimNode): string {
    if (n === head) return 'head'
    const existing = this.m.get(n)
    if (existing) return existing
    const id = `n${this.next++}`
    this.m.set(n, id)
    return id
  }
}

export class SkipListSim {
  readonly head: SimNode
  level = 1
  readonly maxLevel: number
  readonly probability: number
  private readonly rng: () => number

  constructor(seed: number, maxLevel = defaultMaxLevel, p = defaultProbability) {
    this.maxLevel = maxLevel
    this.probability = p
    this.rng = mulberry32(seed >>> 0)
    this.head = { value: null, forward: Array.from({ length: maxLevel }, () => null) }
  }

  private randomLevel(): number {
    let lvl = 1
    while (this.rng() < this.probability && lvl < this.maxLevel) lvl++
    return lvl
  }

  insert(val: number): void {
    const update: SimNode[] = new Array(this.maxLevel)
    let cur: SimNode = this.head
    for (let i = this.level - 1; i >= 0; i--) {
      while (cur.forward[i] != null && cur.forward[i]!.value! < val) {
        cur = cur.forward[i]!
      }
      update[i] = cur
    }
    const lvl = this.randomLevel()
    if (lvl > this.level) {
      for (let i = this.level; i < lvl; i++) update[i] = this.head
      this.level = lvl
    }
    const node: SimNode = { value: val, forward: Array.from({ length: lvl }, () => null) }
    for (let i = 0; i < lvl; i++) {
      node.forward[i] = update[i].forward[i]
      update[i].forward[i] = node
    }
  }

  private graphSnapshot(g: IdGen): GraphSnapshot {
    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []
    for (let cur: SimNode | null = this.head; cur != null; cur = cur.forward[0]) {
      let height = this.level
      if (cur !== this.head) height = cur.forward.length
      const valText = cur === this.head ? '' : String(cur.value ?? '')
      nodes.push({
        id: g.id(this.head, cur),
        value: valText,
        height,
      })
      let nodeLevels = this.level
      if (cur !== this.head) {
        nodeLevels = Math.min(cur.forward.length, this.level)
      }
      for (let lvl = 0; lvl < nodeLevels; lvl++) {
        const nxt = cur.forward[lvl]
        if (nxt != null) {
          edges.push({
            level: lvl,
            from: g.id(this.head, cur),
            to: g.id(this.head, nxt),
          })
        }
      }
    }
    return { listLevel: this.level, nodes, edges }
  }

  private appendStep(
    steps: SearchStep[],
    g: IdGen,
    cursor: SimNode | null,
    activeLevel: number,
    phase: SearchPhase,
  ) {
    let cursorNodeId = ''
    if (cursor != null) cursorNodeId = g.id(this.head, cursor)
    steps.push({
      activeLevel,
      cursorNodeId,
      phase,
      graph: this.graphSnapshot(g),
    })
  }

  searchTrace(target: number): SkipListSearchTrace {
    const g = new IdGen()
    const steps: SearchStep[] = []
    let current: SimNode = this.head
    for (let i = this.level - 1; i >= 0; i--) {
      this.appendStep(steps, g, current, i, 'at_level')
      while (current.forward[i] != null && current.forward[i]!.value! < target) {
        current = current.forward[i]!
        this.appendStep(steps, g, current, i, 'scan_forward')
      }
      this.appendStep(steps, g, current, i, 'end_of_level')
    }
    const cand = current.forward[0]
    this.appendStep(steps, g, cand, 0, 'final_check')
    const found = cand != null && cand.value === target
    this.appendStep(steps, g, cand, 0, 'done')
    return {
      schemaVersion: TraceSchemaVersion,
      kind: 'skiplist-search',
      meta: { targetValue: String(target), found },
      steps,
    }
  }
}

export function parseIntegerList(input: string): number[] {
  const parts = input
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const out: number[] = []
  for (const p of parts) {
    const n = Number(p)
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      throw new Error(`"${p}" is not an integer`)
    }
    out.push(n)
  }
  return out
}

export function buildSkipListSearchTrace(
  values: number[],
  target: number,
  seed: number,
): SkipListSearchTrace {
  const sl = new SkipListSim(seed)
  for (const v of values) sl.insert(v)
  return sl.searchTrace(target)
}
