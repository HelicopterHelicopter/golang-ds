import type { VizProps } from './vizProps'
import { SkipListSearchView } from './SkipListSearchView'

export function SkipListSearchViz({ trace, stepIndex }: VizProps) {
  if (trace.kind !== 'skiplist-search') return null
  const step = trace.steps[Math.min(stepIndex, trace.steps.length - 1)]
  return (
    <SkipListSearchView step={step} trace={trace} stepIndex={stepIndex} />
  )
}
