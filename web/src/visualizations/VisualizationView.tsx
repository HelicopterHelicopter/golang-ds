import type { VizProps } from './vizProps'
import { VISUALIZATIONS } from './vizRegistry'

export function VisualizationView(props: VizProps) {
  const C = VISUALIZATIONS[props.trace.kind]
  if (!C) {
    return (
      <p className="error">
        No visualization registered for kind &quot;{props.trace.kind}&quot;.
      </p>
    )
  }
  return <C {...props} />
}
