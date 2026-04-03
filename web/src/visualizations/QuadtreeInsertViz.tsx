import type { VizProps } from './vizProps'
import { QuadtreeInsertView } from './QuadtreeInsertView'

export function QuadtreeInsertViz({ trace, stepIndex }: VizProps) {
  if (trace.kind !== 'quadtree-insert') return null
  if (trace.steps.length === 0) {
    return <p className="error">No steps in trace.</p>
  }
  const step = trace.steps[Math.min(stepIndex, trace.steps.length - 1)]
  return <QuadtreeInsertView step={step} trace={trace} />
}
