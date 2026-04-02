import type { SearchStep } from '../types/trace'

/** Keys for edges on the search path through step `upToIndex` (inclusive). */
export function buildSearchPathKeys(steps: SearchStep[], upToIndex: number) {
  const horiz = new Set<string>()
  const vert = new Set<string>()
  const hi = Math.max(0, Math.min(upToIndex, steps.length - 1))
  for (let i = 1; i <= hi; i++) {
    const prev = steps[i - 1]!
    const cur = steps[i]!
    if (
      cur.phase === 'scan_forward' &&
      cur.cursorNodeId &&
      prev.cursorNodeId &&
      cur.cursorNodeId !== prev.cursorNodeId
    ) {
      horiz.add(`${cur.activeLevel}:${prev.cursorNodeId}:${cur.cursorNodeId}`)
    }
    if (
      cur.phase === 'at_level' &&
      prev.phase === 'end_of_level' &&
      prev.cursorNodeId &&
      prev.cursorNodeId === cur.cursorNodeId &&
      prev.activeLevel === cur.activeLevel + 1
    ) {
      vert.add(`${cur.cursorNodeId}:${prev.activeLevel}:${cur.activeLevel}`)
    }
    if (
      cur.phase === 'final_check' &&
      prev.cursorNodeId &&
      cur.cursorNodeId &&
      prev.cursorNodeId !== cur.cursorNodeId
    ) {
      horiz.add(`0:${prev.cursorNodeId}:${cur.cursorNodeId}`)
    }
  }
  return { horiz, vert }
}
